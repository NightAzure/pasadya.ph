import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { uuidSchema } from "@/lib/validation";

import { transitionBookingStatus, type BookingStatus } from "../bookings/state";

const checkoutInputSchema = z.object({
  bookingId: uuidSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CheckoutSessionDescriptor = {
  provider: "paymongo" | "local";
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: "PHP";
  status: "pending";
};

type CheckoutBooking = {
  id: string;
  userId: string;
  status: BookingStatus;
  amount: number;
  listingName: string;
};

async function getCheckoutBooking(bookingId: string, actorId?: string) {
  const result = await db.execute<CheckoutBooking>(sql`
    select b.id::text, b.user_id::text as "userId", b.status,
      b.downpayment_amount as amount, l.name as "listingName"
    from bookings b join listings l on l.id = b.listing_id
    where b.id = ${uuidSchema.parse(bookingId)}::uuid
      ${actorId ? sql`and b.user_id = ${uuidSchema.parse(actorId)}::uuid` : sql``}
    limit 1
  `);
  return result.rows[0] ?? null;
}

function localSession(booking: CheckoutBooking): CheckoutSessionDescriptor {
  const sessionId = `local_${createHash("sha256").update(booking.id).digest("hex").slice(0, 24)}`;
  return {
    provider: "local",
    sessionId,
    checkoutUrl: `http://localhost:3000/payments/local/${sessionId}`,
    amount: booking.amount,
    currency: "PHP",
    status: "pending",
  };
}

export async function createCheckoutSession(
  input: unknown,
  actorId?: string,
): Promise<CheckoutSessionDescriptor> {
  const parsed = checkoutInputSchema.parse(input);
  const booking = await getCheckoutBooking(parsed.bookingId, actorId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "accepted" && booking.status !== "awaiting_payment")
    throw new Error("Booking is not ready for payment.");

  const existing = await db.execute<{
    sessionId: string;
    status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  }>(sql`
    select paymongo_session_id as "sessionId", status from payments where booking_id = ${booking.id}::uuid limit 1
  `);
  if (existing.rows[0]?.status === "paid")
    throw new Error("Booking payment is already paid.");

  if (booking.status === "accepted") {
    await transitionBookingStatus(db, {
      bookingId: booking.id,
      from: "accepted",
      to: "awaiting_payment",
    });
  }

  const secret = process.env.PAYMONGO_SECRET_KEY;
  const baseUrl = process.env.PAYMONGO_API_URL ?? "https://api.paymongo.com/v1";
  let descriptor: CheckoutSessionDescriptor;
  if (!secret) {
    descriptor = localSession(booking);
  } else {
    const response = await fetch(`${baseUrl}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                currency: "PHP",
                amount: booking.amount,
                name: booking.listingName,
                quantity: 1,
              },
            ],
            payment_method_types: ["card", "gcash", "paymaya"],
            success_url:
              parsed.successUrl ??
              `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/payments/success`,
            cancel_url:
              parsed.cancelUrl ??
              `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/payments/cancelled`,
            description: `Booking ${booking.id}`,
            metadata: { booking_id: booking.id },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(
        `PayMongo checkout creation failed (${response.status}).`,
      );
    const body = (await response.json()) as {
      data?: { id?: string; attributes?: { checkout_url?: string } };
    };
    const sessionId = body.data?.id;
    const checkoutUrl = body.data?.attributes?.checkout_url;
    if (!sessionId || !checkoutUrl)
      throw new Error("PayMongo returned an incomplete checkout session.");
    descriptor = {
      provider: "paymongo",
      sessionId,
      checkoutUrl,
      amount: booking.amount,
      currency: "PHP",
      status: "pending",
    };
  }

  await db.execute(sql`
    insert into payments (booking_id, paymongo_session_id, amount, status)
    values (${booking.id}::uuid, ${descriptor.sessionId}, ${descriptor.amount}, 'pending'::payment_status)
    on conflict (booking_id) do update set paymongo_session_id = excluded.paymongo_session_id, amount = excluded.amount, status = 'pending'::payment_status
  `);
  return descriptor;
}

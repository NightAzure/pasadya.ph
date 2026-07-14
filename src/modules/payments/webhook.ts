import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { dispatchEvent } from "@/modules/notifications/service";
import { calculateRefund } from "../bookings/refunds";
import { transitionBookingStatus, type BookingStatus } from "../bookings/state";

const eventSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    data: z
      .object({
        id: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  })
  .passthrough();

export function verifyPayMongoWebhookSignature(
  rawBody: string,
  signature: string,
  secret = process.env.PAYMONGO_WEBHOOK_SECRET,
  now = Date.now(),
) {
  if (!secret) throw new Error("PAYMONGO_WEBHOOK_SECRET is not configured.");
  const parts = Object.fromEntries(
    signature
      .split(",")
      .map((part) => part.trim().split("=", 2) as [string, string]),
  );
  const timestamp = Number(parts.t);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(now - timestamp * 1000) > 5 * 60_000
  )
    throw new Error("Expired PayMongo webhook signature.");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const candidate = parts.v1 ?? parts.te ?? parts.li;
  if (!candidate) throw new Error("Missing PayMongo webhook signature.");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new Error("Invalid PayMongo webhook signature.");
  return true;
}

function eventValue(event: z.infer<typeof eventSchema>, key: string) {
  const attributes = event.data?.attributes ?? {};
  const metadata =
    typeof attributes.metadata === "object" && attributes.metadata !== null
      ? (attributes.metadata as Record<string, unknown>)
      : {};
  const value = metadata[key] ?? attributes[key];
  return typeof value === "string" ? value : undefined;
}

export async function handlePayMongoWebhook(
  rawBody: string,
  signature: string,
) {
  verifyPayMongoWebhookSignature(rawBody, signature);
  const event = eventSchema.parse(JSON.parse(rawBody));
  if (
    event.type !== "payment.paid" &&
    event.type !== "checkout_session.payment.paid" &&
    !event.type.includes("refund")
  )
    return { handled: false, duplicate: false, eventId: event.id };

  const result = await db.transaction(async (tx) => {
    const inserted = await tx.execute<{ id: string }>(sql`
      insert into webhook_events (event_id, event_type, payload, processed_at)
      values (${event.id}, ${event.type}, ${rawBody}::jsonb, now())
      on conflict (event_id) do nothing returning id::text
    `);
    if (!inserted.rows[0])
      return { handled: true, duplicate: true, eventId: event.id };

    const paymentId = event.data?.id;
    const sessionId =
      eventValue(event, "checkout_session_id") ??
      eventValue(event, "session_id");
    const bookingId = eventValue(event, "booking_id");
    const payment = await tx.execute<{
      id: string;
      bookingId: string;
      status: string;
      amount: number;
      checkIn: string;
      policy: "flexible" | "moderate" | "strict";
      bookingStatus: BookingStatus;
    }>(sql`
      select p.id::text, p.booking_id::text as "bookingId", p.status, p.amount,
        b.check_in::text as "checkIn", l.cancellation_policy as policy, b.status as "bookingStatus"
      from payments p join bookings b on b.id = p.booking_id join listings l on l.id = b.listing_id
      where ${paymentId ? sql`p.paymongo_payment_id = ${paymentId}` : sql`false`}
         or ${sessionId ? sql`p.paymongo_session_id = ${sessionId}` : sql`false`}
         or ${bookingId ? sql`p.booking_id = ${bookingId}::uuid` : sql`false`}
      limit 1
      for update
    `);
    const row = payment.rows[0];
    if (!row)
      throw new Error("PayMongo webhook does not identify a local payment.");

    if (event.type.includes("refund")) {
      const calculation = calculateRefund({
        policy: row.policy,
        amountPaid: row.amount,
        checkIn: row.checkIn,
        at: new Date(),
      });
      const refundAmount = Number(
        eventValue(event, "amount") ?? calculation.refundAmount,
      );
      await tx.execute(
        sql`update payments set status = ${refundAmount >= row.amount ? "refunded" : "partially_refunded"}::payment_status, refunded_at = now(), refund_amount = ${refundAmount} where id = ${row.id}::uuid`,
      );
      if (row.bookingStatus !== "refunded")
        await transitionBookingStatus(tx, {
          bookingId: row.bookingId,
          from: row.bookingStatus,
          to: "refunded",
        });
    } else {
      await tx.execute(
        sql`update payments set status = 'paid'::payment_status, paymongo_payment_id = coalesce(paymongo_payment_id, ${paymentId ?? null}), paid_at = coalesce(paid_at, now()) where id = ${row.id}::uuid`,
      );
      if (row.bookingStatus === "awaiting_payment")
        await transitionBookingStatus(tx, {
          bookingId: row.bookingId,
          from: "awaiting_payment",
          to: "confirmed",
        });
    }
    return {
      handled: true,
      duplicate: false,
      eventId: event.id,
      bookingId: row.bookingId,
    };
  });
  if (!result.duplicate && result.bookingId && !event.type.includes("refund")) {
    const booking = await db.execute<{
      userId: string;
      listingName: string;
    }>(sql`
      select b.user_id::text as "userId", l.name as "listingName"
      from bookings b join listings l on l.id = b.listing_id
      where b.id = ${result.bookingId}::uuid limit 1
    `);
    const guest = booking.rows[0];
    if (guest) {
      await dispatchEvent({
        userId: guest.userId,
        event: "booking.payment_received",
        data: {
          title: "Payment received",
          body: `Your downpayment for ${guest.listingName} was verified.`,
          bookingId: result.bookingId,
        },
      });
    }
  }
  return result;
}

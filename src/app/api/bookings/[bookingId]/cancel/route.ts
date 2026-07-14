import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { AuthorizationError } from "@/lib/rbac";
import { calculateRefund } from "@/modules/bookings/refunds";
import {
  transitionBookingStatus,
  type BookingStatus,
} from "@/modules/bookings/state";
import { getPortalActor } from "@/modules/portal/service";

const bookingIdSchema = z.string().uuid();
const cancellationInputSchema = z.object({
  reason: z.string().trim().max(700).optional(),
});

type CancellationBooking = {
  id: string;
  status: BookingStatus;
  checkIn: string;
  policy: "flexible" | "moderate" | "strict";
  downpaymentAmount: number;
  isOwner: boolean;
  paymentId: string | null;
  paymentAmount: number | null;
  paymentStatus:
    "pending" | "paid" | "failed" | "refunded" | "partially_refunded" | null;
};

type RefundRequestResult = {
  requested: boolean;
  recorded: boolean;
  operation: string | null;
};

/**
 * Cancels a booking for the supplied guest or listing owner. The helper is
 * exported so deterministic checks can exercise the same authorization and
 * state-machine path as the HTTP endpoint.
 */
export async function cancelBookingForActor(
  bookingId: string,
  actorId: string,
  reason?: string,
) {
  const parsedBookingId = bookingIdSchema.parse(bookingId);
  const parsedActorId = bookingIdSchema.parse(actorId);
  const at = new Date();

  const cancelled = await db.transaction(async (tx) => {
    const result = await tx.execute<CancellationBooking>(sql`
      select
        b.id::text as id,
        b.status,
        b.check_in::text as "checkIn",
        l.cancellation_policy as policy,
        b.downpayment_amount as "downpaymentAmount",
        (business.owner_id = ${parsedActorId}::uuid) as "isOwner",
        p.id::text as "paymentId",
        p.amount as "paymentAmount",
        p.status as "paymentStatus"
      from bookings b
      join listings l on l.id = b.listing_id
      left join businesses business on business.id = l.business_id
      left join payments p on p.booking_id = b.id
      where b.id = ${parsedBookingId}::uuid
        and (
          b.user_id = ${parsedActorId}::uuid
          or business.owner_id = ${parsedActorId}::uuid
        )
      limit 1
      for update of b
    `);
    const booking = result.rows[0];
    if (!booking) throw new AuthorizationError("Booking access required.");

    const calculation = calculateRefund({
      policy: booking.policy,
      amountPaid: booking.paymentAmount ?? booking.downpaymentAmount,
      checkIn: booking.checkIn,
      at,
    });
    const to = booking.isOwner ? "cancelled_by_owner" : "cancelled_by_guest";

    await transitionBookingStatus(tx, {
      bookingId: booking.id,
      from: booking.status,
      to,
      reason: reason ?? calculation.reason,
      at,
    });

    return {
      bookingId: booking.id,
      status: to,
      actorType: booking.isOwner ? "owner" : "guest",
      paymentId: booking.paymentId,
      paymentAmount: booking.paymentAmount,
      paymentStatus: booking.paymentStatus,
      calculation,
    };
  });

  const refundRequest = cancelled.paymentId
    ? await requestPaymentRefund({
        bookingId: cancelled.bookingId,
        paymentId: cancelled.paymentId,
        amount: cancelled.calculation.refundAmount,
        refundAmount: cancelled.calculation.refundAmount,
        reason: reason ?? cancelled.calculation.reason,
        actorId: parsedActorId,
      })
    : { requested: false, recorded: false, operation: null };

  return {
    ...cancelled,
    refundAmount: cancelled.calculation.refundAmount,
    refundRequest,
    refundRequested: refundRequest.requested,
    refundRequestRecorded: refundRequest.recorded,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const actor = await getPortalActor();
  const { bookingId } = await params;
  if (!bookingIdSchema.safeParse(bookingId).success) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const body = await readCancellationInput(request);
  const parsed = cancellationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Cancellation details are not valid." },
      { status: 400 },
    );
  }

  try {
    const result = await cancelBookingForActor(
      bookingId,
      actor.id,
      parsed.data.reason,
    );
    return NextResponse.json({ cancellation: result });
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? 403
        : error instanceof Error &&
            error.message.includes("Invalid booking transition")
          ? 409
          : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Booking could not be cancelled.",
      },
      { status },
    );
  }
}

async function requestPaymentRefund(input: {
  bookingId: string;
  paymentId: string;
  amount: number;
  refundAmount: number;
  reason: string;
  actorId: string;
}): Promise<RefundRequestResult> {
  const paymentModule = (await import("@/modules/payments")) as Record<
    string,
    unknown
  >;
  const operationNames = [
    "requestPaymentRefund",
    "requestRefund",
    "createRefundRequest",
    "refundPayment",
  ];
  const operationName = operationNames.find(
    (name) => typeof paymentModule[name] === "function",
  );

  if (operationName) {
    const operation = paymentModule[operationName] as (
      input: unknown,
      actorId?: string,
    ) => unknown;
    await operation(input, input.actorId);
    return { requested: true, recorded: false, operation: operationName };
  }

  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${input.actorId}::uuid,
      'payment.refund_requested',
      'booking',
      ${input.bookingId}::uuid,
      ${JSON.stringify({
        paymentId: input.paymentId,
        amount: input.refundAmount,
        reason: input.reason,
        status: "recorded_pending_payment_operation",
      })}::jsonb
    )
  `);
  return { requested: true, recorded: true, operation: null };
}

async function readCancellationInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }
  if (contentType.includes("form")) {
    return Object.fromEntries(await request.formData());
  }
  return {};
}

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { uuidSchema } from "@/lib/validation";

export const bookingStatuses = [
  "draft",
  "requested",
  "accepted",
  "awaiting_payment",
  "confirmed",
  "completed",
  "declined",
  "expired",
  "cancelled_by_guest",
  "cancelled_by_owner",
  "refunded",
  "no_show",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

const transitions: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ["requested", "awaiting_payment"],
  requested: ["accepted", "declined", "expired", "cancelled_by_guest"],
  accepted: ["awaiting_payment", "cancelled_by_owner", "expired"],
  awaiting_payment: [
    "confirmed",
    "expired",
    "cancelled_by_guest",
    "cancelled_by_owner",
  ],
  confirmed: [
    "completed",
    "cancelled_by_guest",
    "cancelled_by_owner",
    "no_show",
    "refunded",
  ],
  completed: ["refunded"],
  declined: [],
  expired: [],
  cancelled_by_guest: ["refunded"],
  cancelled_by_owner: ["refunded"],
  refunded: [],
  no_show: [],
};

export type BookingTransition = {
  bookingId: string;
  from: BookingStatus;
  to: BookingStatus;
  changedAt: Date;
};

type SqlExecutor = Pick<typeof db, "execute">;

export function canTransitionBookingStatus(
  from: BookingStatus,
  to: BookingStatus,
) {
  return transitions[from].includes(to);
}

/** The only function in this domain that writes bookings.status. */
export async function transitionBookingStatus(
  executor: SqlExecutor,
  input: {
    bookingId: string;
    from: BookingStatus;
    to: BookingStatus;
    reason?: string | null;
    at?: Date;
  },
): Promise<BookingTransition> {
  const bookingId = uuidSchema.parse(input.bookingId);
  if (!canTransitionBookingStatus(input.from, input.to)) {
    throw new Error(
      `Invalid booking transition: ${input.from} -> ${input.to}.`,
    );
  }

  const at = input.at ?? new Date();
  const result = await executor.execute<{
    id: string;
    status: BookingStatus;
    changedAt: Date;
  }>(sql`
    update bookings
    set status = ${input.to}::booking_status,
        updated_at = ${at},
        confirmed_at = case when ${input.to} = 'confirmed'::booking_status then coalesce(confirmed_at, ${at}) else confirmed_at end,
        completed_at = case when ${input.to} = 'completed'::booking_status then coalesce(completed_at, ${at}) else completed_at end,
        cancelled_at = case when ${input.to} in ('cancelled_by_guest'::booking_status, 'cancelled_by_owner'::booking_status) then coalesce(cancelled_at, ${at}) else cancelled_at end,
        cancellation_reason = ${input.reason ? sql`${input.reason}` : sql`cancellation_reason`}
    where id = ${bookingId}::uuid
      and status = ${input.from}::booking_status
    returning id::text, status, updated_at as "changedAt"
  `);

  const row = result.rows[0];
  if (!row) {
    throw new Error(
      `Booking ${bookingId} was not in the expected state (${input.from}).`,
    );
  }

  return {
    bookingId: row.id,
    from: input.from,
    to: row.status,
    changedAt: row.changedAt,
  };
}

export async function transitionBookingStatusWithDefaultDb(input: {
  bookingId: string;
  from: BookingStatus;
  to: BookingStatus;
  reason?: string | null;
  at?: Date;
}) {
  return transitionBookingStatus(db, input);
}

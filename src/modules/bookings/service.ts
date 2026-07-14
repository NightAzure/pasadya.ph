import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { AuthorizationError } from "@/lib/rbac";
import { uuidSchema } from "@/lib/validation";
import { dispatchEvent } from "@/modules/notifications/service";

import {
  calculateRefund,
  cancellationPolicies,
  type CancellationPolicy,
  type RefundCalculation,
} from "./refunds";
import { transitionBookingStatus, type BookingStatus } from "./state";

const dateSchema = z.string().date();

export const bookingInputSchema = z.object({
  listingId: uuidSchema,
  ratePlanId: uuidSchema,
  checkIn: dateSchema,
  checkOut: dateSchema,
  pax: z.coerce.number().int().min(1).max(999),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().min(8).max(24).optional(),
  guestEmail: z.string().trim().email().max(180).optional(),
  specialRequests: z.string().trim().max(1_000).optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export type BookingView = {
  id: string;
  listingId: string;
  listingName: string;
  listingSlug: string;
  userId: string;
  ratePlanId: string;
  ratePlanName: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  pax: number;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  specialRequests: string | null;
  subtotal: number;
  downpaymentAmount: number;
  balanceDue: number;
  currency: string;
  cancellationPolicy: CancellationPolicy;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  paymentStatus:
    "pending" | "paid" | "failed" | "refunded" | "partially_refunded" | null;
  checkoutUrl: string | null;
};

type ListingRate = {
  listingId: string;
  listingName: string;
  bookingMode: "inquiry" | "instant" | "none";
  cancellationPolicy: CancellationPolicy;
  downpaymentPct: number;
  ratePlanId: string;
  price: number;
  priceUnit: "per_night" | "per_person" | "per_group" | "flat";
  minPax: number;
  maxPax: number | null;
};

type AvailabilityPriceRow = {
  day: string;
  available: boolean | null;
  capacity: number | null;
  bookedPax: string;
  price: number;
};

export type BookingQuote = {
  listingId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  currency: "PHP";
  subtotal: number;
  downpaymentAmount: number;
  balanceDue: number;
  nights: number;
  days: number;
  cancellationPolicy: CancellationPolicy;
  rate: { price: number; priceUnit: ListingRate["priceUnit"] };
};

const activeBookingStatuses = [
  "requested",
  "accepted",
  "awaiting_payment",
  "confirmed",
] as const;

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function dateDiff(start: string, end: string) {
  return Math.round(
    (new Date(`${end}T00:00:00.000Z`).getTime() -
      new Date(`${start}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

type BookingExecutor = {
  execute: typeof db.execute;
};

async function quoteWithAvailability(
  input: BookingInput,
  expectedMode?: "inquiry" | "instant",
  executor: BookingExecutor = db,
) {
  if (input.checkIn < todayUtc())
    throw new Error("Check-in cannot be in the past.");
  const days = dateDiff(input.checkIn, input.checkOut);
  if (days < 0) throw new Error("Check-out cannot be before check-in.");

  const listingResult = await executor.execute<ListingRate>(sql`
    select
      l.id::text as "listingId", l.name as "listingName", l.booking_mode as "bookingMode",
      l.cancellation_policy as "cancellationPolicy", l.downpayment_pct as "downpaymentPct",
      rp.id::text as "ratePlanId", rp.price, rp.price_unit as "priceUnit",
      rp.min_pax as "minPax", rp.max_pax as "maxPax"
    from listings l join rate_plans rp on rp.listing_id = l.id
    where l.id = ${input.listingId}::uuid and rp.id = ${input.ratePlanId}::uuid
      and rp.active = true and l.status = 'published'::listing_status
    limit 1
  `);
  const listingRate = listingResult.rows[0] ?? null;
  if (!listingRate)
    throw new Error("Published listing or active rate plan not found.");
  if (listingRate.bookingMode === "none")
    throw new Error("This listing does not accept bookings.");
  if (expectedMode && listingRate.bookingMode !== expectedMode) {
    throw new Error(
      `This listing is configured for ${listingRate.bookingMode} bookings.`,
    );
  }
  if (
    input.pax < listingRate.minPax ||
    (listingRate.maxPax !== null && input.pax > listingRate.maxPax)
  ) {
    throw new Error(
      "The requested pax count is outside this rate plan's limits.",
    );
  }

  await executor.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`${input.listingId}:${input.ratePlanId}`}))`,
  );
  const availability = (await executor.execute<AvailabilityPriceRow>(sql`
    select
      requested.day::date::text as day,
      coalesce(rate_block.available, listing_block.available, true) as available,
      coalesce(rate_block.quantity, listing_block.quantity, 999) as capacity,
      coalesce(occupied.booked_pax, '0') as "bookedPax",
      coalesce(rate_block.price_override, listing_block.price_override, ${listingRate.price}) as price
    from generate_series(
      ${input.checkIn}::date,
      greatest(${input.checkIn}::date, (${input.checkOut}::date - interval '1 day')),
      interval '1 day'
    ) as requested(day)
    left join availability_blocks rate_block
      on rate_block.listing_id = ${input.listingId}::uuid
      and rate_block.rate_plan_id = ${input.ratePlanId}::uuid
      and rate_block.date = requested.day::date
    left join availability_blocks listing_block
      on listing_block.listing_id = ${input.listingId}::uuid
      and listing_block.rate_plan_id is null
      and listing_block.date = requested.day::date
    left join lateral (
      select coalesce(sum(b.pax), 0)::text as booked_pax
      from bookings b
      where b.listing_id = ${input.listingId}::uuid
        and b.rate_plan_id = ${input.ratePlanId}::uuid
        and b.check_in <= requested.day::date
        and b.check_out > requested.day::date
        and b.status in (${sql.join(
          activeBookingStatuses.map((status) => sql`${status}::booking_status`),
          sql`, `,
        )})
    ) occupied on true
    order by requested.day
  `)) as { rows: AvailabilityPriceRow[] };

  if (
    availability.rows.length !== Math.max(days, 1) ||
    availability.rows.some(
      (row) =>
        !row.available ||
        Number(row.bookedPax) + input.pax > Number(row.capacity),
    )
  ) {
    throw new Error(
      "The selected dates are not available for the requested party size.",
    );
  }

  const subtotal = availability.rows.reduce((total, row) => {
    const dailyRate = Number(row.price);
    if (listingRate.priceUnit === "per_person")
      return total + dailyRate * input.pax;
    if (listingRate.priceUnit === "flat")
      return total + (total === 0 ? dailyRate : 0);
    return total + dailyRate;
  }, 0);
  const downpaymentAmount = Math.min(
    subtotal,
    Math.max(0, Math.round((subtotal * listingRate.downpaymentPct) / 100)),
  );

  return {
    listingRate,
    quote: {
      listingId: input.listingId,
      ratePlanId: input.ratePlanId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      pax: input.pax,
      currency: "PHP" as const,
      subtotal,
      downpaymentAmount,
      balanceDue: subtotal - downpaymentAmount,
      nights: listingRate.priceUnit === "per_night" ? days : 0,
      days,
      cancellationPolicy: listingRate.cancellationPolicy,
      rate: { price: listingRate.price, priceUnit: listingRate.priceUnit },
    } satisfies BookingQuote,
  };
}

export async function quoteBooking(input: unknown): Promise<BookingQuote> {
  const parsed = bookingInputSchema.parse(input);
  return (await quoteWithAvailability(parsed)).quote;
}

async function createStoredBooking(
  input: unknown,
  guestId: string,
  mode: "inquiry" | "instant",
) {
  const parsed = bookingInputSchema.parse(input);
  const userId = uuidSchema.parse(guestId);

  const booking = await db.transaction(async (tx) => {
    const { quote } = await quoteWithAvailability(parsed, mode, tx);
    const expiresAt = new Date(
      Date.now() + (mode === "inquiry" ? 48 : 24) * 60 * 60_000,
    );
    const inserted = await tx.execute<{ id: string }>(sql`
      insert into bookings (
        listing_id, user_id, rate_plan_id, status, check_in, check_out, pax,
        guest_name, guest_phone, guest_email, special_requests, subtotal,
        downpayment_amount, balance_due, currency, expires_at
      ) values (
        ${parsed.listingId}::uuid, ${userId}::uuid, ${parsed.ratePlanId}::uuid, 'draft'::booking_status,
        ${parsed.checkIn}::date, ${parsed.checkOut}::date, ${parsed.pax},
        ${parsed.guestName}, ${parsed.guestPhone ?? null}, ${parsed.guestEmail ?? null}, ${parsed.specialRequests ?? null},
        ${quote.subtotal}, ${quote.downpaymentAmount}, ${quote.balanceDue}, 'PHP', ${expiresAt}
      ) returning id::text
    `);
    const bookingId = inserted.rows[0]?.id;
    if (!bookingId) throw new Error("Booking could not be created.");

    await transitionBookingStatus(tx, {
      bookingId,
      from: "draft",
      to: mode === "instant" ? "awaiting_payment" : "requested",
    });

    return getBooking(bookingId, userId, tx);
  });
  if (booking) {
    const owner = await db.execute<{ id: string }>(sql`
      select business.owner_id::text as id
      from bookings b join listings l on l.id = b.listing_id
      join businesses business on business.id = l.business_id
      where b.id = ${booking.id}::uuid limit 1
    `);
    if (owner.rows[0]?.id) {
      await dispatchEvent({
        userId: owner.rows[0].id,
        event: "booking.requested",
        data: {
          title: "New booking request",
          body: `${booking.guestName} sent a booking request for ${booking.listingName}.`,
          bookingId: booking.id,
          listingId: booking.listingId,
        },
      });
    }
  }
  return booking;
}

export function createInquiryBooking(input: unknown, guestId: string) {
  return createStoredBooking(input, guestId, "inquiry");
}

export function createInstantBooking(input: unknown, guestId: string) {
  return createStoredBooking(input, guestId, "instant");
}

async function getBooking(
  bookingId: string,
  actorId?: string,
  executor: BookingExecutor = db,
) {
  const parsedBookingId = uuidSchema.parse(bookingId);
  const result = await executor.execute<BookingView>(sql`
    select
      b.id::text as id,
      b.listing_id::text as "listingId",
      l.name as "listingName",
      l.slug as "listingSlug",
      b.user_id::text as "userId",
      b.rate_plan_id::text as "ratePlanId",
      rp.name as "ratePlanName",
      b.status,
      b.check_in::text as "checkIn",
      b.check_out::text as "checkOut",
      b.pax,
      b.guest_name as "guestName",
      b.guest_phone as "guestPhone",
      b.guest_email as "guestEmail",
      b.special_requests as "specialRequests",
      b.subtotal,
      b.downpayment_amount as "downpaymentAmount",
      b.balance_due as "balanceDue",
      b.currency,
      l.cancellation_policy as "cancellationPolicy",
      b.expires_at as "expiresAt",
      b.confirmed_at as "confirmedAt",
      b.created_at as "createdAt"
      ,p.status as "paymentStatus"
      ,case when p.paymongo_session_id is not null then concat(coalesce(${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}::text, 'http://localhost:3000'), '/account/bookings/', b.id::text, '?checkout=', p.paymongo_session_id) else null end as "checkoutUrl"
    from bookings b join listings l on l.id = b.listing_id
    left join rate_plans rp on rp.id = b.rate_plan_id
    left join payments p on p.booking_id = b.id
    where b.id = ${parsedBookingId}::uuid
      ${actorId ? sql`and b.user_id = ${uuidSchema.parse(actorId)}::uuid` : sql``}
    limit 1
  `);
  return result.rows[0] ?? null;
}

async function assertOwner(
  bookingId: string,
  ownerId: string,
  executor: BookingExecutor = db,
) {
  const result = await executor.execute<{
    id: string;
    status: BookingStatus;
  }>(sql`
    select b.id::text, b.status
    from bookings b
    join listings l on l.id = b.listing_id
    join businesses business on business.id = l.business_id
    where b.id = ${uuidSchema.parse(bookingId)}::uuid
      and business.owner_id = ${uuidSchema.parse(ownerId)}::uuid
    limit 1
  `);
  const booking = result.rows[0];
  if (!booking) throw new AuthorizationError("Owner access required.");
  return booking;
}

export async function ownerAcceptBooking(bookingId: string, ownerId: string) {
  const booking = await db.transaction(async (tx) => {
    const booking = await assertOwner(bookingId, ownerId, tx);
    await transitionBookingStatus(tx, {
      bookingId,
      from: booking.status,
      to: "accepted",
    });
    await tx.execute(sql`
      update bookings set expires_at = now() + interval '24 hours', updated_at = now()
      where id = ${uuidSchema.parse(bookingId)}::uuid
    `);
    return getBooking(bookingId, undefined, tx);
  });
  if (booking) {
    await dispatchEvent({
      userId: booking.userId,
      event: "booking.accepted",
      data: {
        title: "Your booking was accepted",
        body: `${booking.listingName} accepted your request. Complete the downpayment before the payment window ends.`,
        bookingId: booking.id,
        listingId: booking.listingId,
      },
    });
  }
  return booking;
}

export async function ownerDeclineBooking(
  bookingId: string,
  ownerId: string,
  reason?: string,
) {
  const booking = await db.transaction(async (tx) => {
    const booking = await assertOwner(bookingId, ownerId, tx);
    if (booking.status !== "requested")
      throw new Error("Only requested bookings can be declined.");
    await transitionBookingStatus(tx, {
      bookingId,
      from: "requested",
      to: "declined",
      reason: reason ?? "Declined by owner.",
    });
    return getBooking(bookingId, undefined, tx);
  });
  if (booking) {
    await dispatchEvent({
      userId: booking.userId,
      event: "booking.declined",
      data: {
        title: "Your booking was declined",
        body: `${booking.listingName} could not accept your requested dates.`,
        bookingId: booking.id,
        listingId: booking.listingId,
      },
    });
  }
  return booking;
}

export async function getBookingForActor(bookingId: string, actorId: string) {
  const parsedBookingId = uuidSchema.parse(bookingId);
  const parsedActorId = uuidSchema.parse(actorId);
  const result = await db.execute<BookingView>(sql`
    select
      b.id::text as id, b.listing_id::text as "listingId", l.name as "listingName", l.slug as "listingSlug",
      b.user_id::text as "userId", b.rate_plan_id::text as "ratePlanId", rp.name as "ratePlanName", b.status,
      b.check_in::text as "checkIn", b.check_out::text as "checkOut", b.pax, b.guest_name as "guestName",
      b.guest_phone as "guestPhone", b.guest_email as "guestEmail", b.special_requests as "specialRequests",
      b.subtotal, b.downpayment_amount as "downpaymentAmount", b.balance_due as "balanceDue", b.currency,
      l.cancellation_policy as "cancellationPolicy", b.expires_at as "expiresAt", b.confirmed_at as "confirmedAt",
      b.created_at as "createdAt", p.status as "paymentStatus",
      case when p.paymongo_session_id is not null then concat(${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}::text, '/account/bookings/', b.id::text, '?checkout=', p.paymongo_session_id) else null end as "checkoutUrl"
    from bookings b
    join listings l on l.id = b.listing_id
    left join rate_plans rp on rp.id = b.rate_plan_id
    left join payments p on p.booking_id = b.id
    where b.id = ${parsedBookingId}::uuid
      and (b.user_id = ${parsedActorId}::uuid or exists (
        select 1 from businesses business where business.id = l.business_id and business.owner_id = ${parsedActorId}::uuid
      ))
    limit 1
  `);
  return result.rows[0] ?? null;
}

export async function listBookingsForActor(actorId: string) {
  const result = await db.execute<BookingView>(sql`
    select b.id::text as id, b.listing_id::text as "listingId", l.name as "listingName", l.slug as "listingSlug",
      b.user_id::text as "userId", b.rate_plan_id::text as "ratePlanId", rp.name as "ratePlanName", b.status,
      b.check_in::text as "checkIn", b.check_out::text as "checkOut", b.pax, b.guest_name as "guestName",
      b.guest_phone as "guestPhone", b.guest_email as "guestEmail", b.special_requests as "specialRequests",
      b.subtotal, b.downpayment_amount as "downpaymentAmount", b.balance_due as "balanceDue", b.currency,
      l.cancellation_policy as "cancellationPolicy", b.expires_at as "expiresAt", b.confirmed_at as "confirmedAt",
      b.created_at as "createdAt", p.status as "paymentStatus",
      case when p.paymongo_session_id is not null then concat(${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}::text, '/account/bookings/', b.id::text, '?checkout=', p.paymongo_session_id) else null end as "checkoutUrl"
    from bookings b join listings l on l.id = b.listing_id left join rate_plans rp on rp.id = b.rate_plan_id left join payments p on p.booking_id = b.id
    where b.user_id = ${uuidSchema.parse(actorId)}::uuid order by b.created_at desc
  `);
  return result.rows;
}

export async function listOwnerBookings(actorId: string) {
  const result = await db.execute<
    BookingView & { ownerNote: string | null }
  >(sql`
    select b.id::text as id, b.listing_id::text as "listingId", l.name as "listingName", l.slug as "listingSlug",
      b.user_id::text as "userId", b.rate_plan_id::text as "ratePlanId", rp.name as "ratePlanName", b.status,
      b.check_in::text as "checkIn", b.check_out::text as "checkOut", b.pax, b.guest_name as "guestName",
      b.guest_phone as "guestPhone", b.guest_email as "guestEmail", b.special_requests as "specialRequests",
      b.subtotal, b.downpayment_amount as "downpaymentAmount", b.balance_due as "balanceDue", b.currency,
      l.cancellation_policy as "cancellationPolicy", b.expires_at as "expiresAt", b.confirmed_at as "confirmedAt",
      b.created_at as "createdAt", p.status as "paymentStatus", null::text as "checkoutUrl",
      b.special_requests as "ownerNote"
    from bookings b join listings l on l.id = b.listing_id join businesses business on business.id = l.business_id
      left join rate_plans rp on rp.id = b.rate_plan_id left join payments p on p.booking_id = b.id
    where business.owner_id = ${uuidSchema.parse(actorId)}::uuid order by b.created_at desc
  `);
  return result.rows;
}

export async function createBooking(
  input: {
    listingId: string;
    ratePlanName: string;
    checkIn: string;
    checkOut: string;
    pax: number;
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    specialRequests?: string;
  },
  guestId: string,
) {
  const rate = await db.execute<{
    id: string;
    mode: "inquiry" | "instant";
  }>(sql`
    select rp.id::text as id, l.booking_mode as mode
    from rate_plans rp join listings l on l.id = rp.listing_id
    where rp.listing_id = ${uuidSchema.parse(input.listingId)}::uuid and rp.name = ${input.ratePlanName} and rp.active = true limit 1
  `);
  const selected = rate.rows[0];
  if (!selected)
    throw new Error("The selected rate plan is no longer available.");
  const base = { ...input, ratePlanId: selected.id };
  const booking =
    selected.mode === "instant"
      ? await createInstantBooking(base, guestId)
      : await createInquiryBooking(base, guestId);
  if (selected.mode === "instant") {
    const { createCheckoutSession } =
      await import("@/modules/payments/service");
    const checkout = await createCheckoutSession({
      bookingId: booking?.id,
      actorId: guestId,
    });
    return {
      bookingId: booking?.id,
      status: booking?.status,
      checkoutUrl: checkout.checkoutUrl,
    };
  }
  return { bookingId: booking?.id, status: booking?.status, checkoutUrl: null };
}

export const acceptBooking = ownerAcceptBooking;
export const declineBooking = ownerDeclineBooking;

export async function completeBooking(bookingId: string, ownerId: string) {
  return db.transaction(async (tx) => {
    const booking = await assertOwner(bookingId, ownerId, tx);
    if (booking.status !== "confirmed")
      throw new Error("Only confirmed bookings can be completed.");
    await transitionBookingStatus(tx, {
      bookingId,
      from: "confirmed",
      to: "completed",
    });
    return getBooking(bookingId, undefined, tx);
  });
}

export const markBookingCompleted = completeBooking;
export const completeStay = completeBooking;

export async function expireDueBookings(at = new Date()) {
  const due = await db.execute<{
    id: string;
    status: BookingStatus;
    userId: string;
    listingName: string;
  }>(sql`
    select b.id::text, b.status, b.user_id::text as "userId", l.name as "listingName"
    from bookings b join listings l on l.id = b.listing_id
    where b.status in ('requested'::booking_status, 'accepted'::booking_status, 'awaiting_payment'::booking_status)
      and b.expires_at is not null and b.expires_at <= ${at}
    order by b.expires_at asc
  `);
  const expired: string[] = [];
  for (const booking of due.rows) {
    try {
      await transitionBookingStatus(db, {
        bookingId: booking.id,
        from: booking.status,
        to: "expired",
        at,
      });
      expired.push(booking.id);
      await dispatchEvent({
        userId: booking.userId,
        event: "booking.expired",
        data: {
          title: "Booking expired",
          body: `The payment window for ${booking.listingName} ended before payment was verified.`,
          bookingId: booking.id,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("expected state")
      )
        throw error;
    }
  }
  return expired;
}

export async function calculateBookingRefund(
  bookingId: string,
  at = new Date(),
): Promise<RefundCalculation> {
  const result = await db.execute<{
    policy: CancellationPolicy;
    amountPaid: number;
    checkIn: string;
  }>(sql`
    select l.cancellation_policy as policy, coalesce(p.amount, b.downpayment_amount) as "amountPaid", b.check_in::text as "checkIn"
    from bookings b join listings l on l.id = b.listing_id
    left join payments p on p.booking_id = b.id
    where b.id = ${uuidSchema.parse(bookingId)}::uuid
    limit 1
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Booking not found.");
  return calculateRefund({
    policy: row.policy,
    amountPaid: row.amountPaid,
    checkIn: row.checkIn,
    at,
  });
}

export { calculateRefund, cancellationPolicies };

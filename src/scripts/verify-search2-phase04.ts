import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import { createInquiryBooking } from "@/modules/bookings";
import {
  calculateQuoteFromEvidence,
  getCheapestAuthoritativeQuote,
  getAuthoritativeQuote,
  type QuoteRequest,
} from "@/modules/pricing/service";

const prefix = "search2-phase04";
const listingSlug = `${prefix}-fixture`;
const checkIn = "2030-09-10";
const checkOut = "2030-09-11";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 4 verification failed: ${message}`);
  console.log(`ok - ${message}`);
}

async function run() {
  await reset();
  try {
    verifyAllBillingCombinations();
    const fixture = await createFixture();
    await verifyDatabaseQuoteAndOverrides(fixture);
    await verifyUnknownAndAmbiguousRejections(fixture);
    await verifyTransactionalReservationAndSnapshot(fixture);
    console.log("Search 2.0 Phase 4 pricing/inventory verification passed");
  } finally {
    await reset();
    await pool.end();
  }
}

function verifyAllBillingCombinations() {
  const periods = ["once", "night", "day", "hour"] as const;
  const units = ["inventory_unit", "person", "group"] as const;
  for (const period of periods) {
    for (const unit of units) {
      const input: QuoteRequest = {
        listingId: "00000000-0000-4000-8000-000000000001",
        ratePlanId: "00000000-0000-4000-8000-000000000002",
        checkIn,
        checkOut:
          period === "night" || period === "day" || period === "once"
            ? checkOut
            : checkIn,
        pax: 3,
        requestedUnits: 2,
        ...(period === "hour" ? { durationHours: 2 } : {}),
      };
      const result = calculateQuoteFromEvidence({
        input,
        rate: {
          listingId: input.listingId,
          ratePlanId: input.ratePlanId,
          ratePlanName: `${period}-${unit}`,
          bookingMode: "inquiry",
          cancellationPolicy: "flexible",
          downpaymentPct: 50,
          price: 1_000,
          billingPeriod: period,
          billingUnit: unit,
          includedPax: 2,
          extraPaxCharge: 100,
          capacityPerUnit: 2,
          inventoryUnitLabel: "unit",
          availableQuantity: 2,
          minPax: 1,
          maxPax: 10,
          quoteEligibility: "eligible",
          mandatoryFee: 0,
          mandatoryFeeLabel: null,
          mandatoryFeeBasis: "fixed_per_booking",
          feesDeclaredAt: new Date("2030-01-01T00:00:00Z"),
          mandatoryChargeDisclosureStatus: "none",
          pricingTrustStatus: "owner_provided",
          pricingVerifiedAt: new Date("2030-01-01T00:00:00Z"),
          pricingValidUntil: new Date("2030-12-31T00:00:00Z"),
          availabilityTrustStatus: "owner_provided",
          availabilityVerifiedAt: new Date("2030-01-01T00:00:00Z"),
          availabilityValidUntil: new Date("2030-12-31T00:00:00Z"),
        },
        availability: [
          {
            date: checkIn,
            available: true,
            capacity: 2,
            reserved: "0",
            price: 1_000,
            priceSource: "base",
          },
        ],
      });
      assert(result.ok, `${period} × ${unit} returns an exact quote`);
      if (result.ok) {
        assert(
          result.quote.reservedUnits === 2,
          `${period} × ${unit} preserves requested units`,
        );
        assert(
          result.quote.breakdown[0]?.extraPaxAmount === 0,
          `${period} × ${unit} applies included pax per reserved unit`,
        );
      }
    }
  }
  const extraPax = calculateQuoteFromEvidence({
    input: {
      listingId: "00000000-0000-4000-8000-000000000001",
      ratePlanId: "00000000-0000-4000-8000-000000000002",
      checkIn,
      checkOut,
      pax: 5,
      requestedUnits: 2,
    },
    rate: {
      listingId: "00000000-0000-4000-8000-000000000001",
      ratePlanId: "00000000-0000-4000-8000-000000000002",
      ratePlanName: "extra-pax",
      bookingMode: "inquiry",
      cancellationPolicy: "flexible",
      downpaymentPct: 50,
      price: 1000,
      billingPeriod: "day",
      billingUnit: "inventory_unit",
      includedPax: 2,
      extraPaxCharge: 100,
      capacityPerUnit: 3,
      inventoryUnitLabel: "room",
      availableQuantity: 2,
      minPax: 1,
      maxPax: 10,
      quoteEligibility: "eligible",
      mandatoryFee: 0,
      mandatoryFeeLabel: null,
      mandatoryFeeBasis: "fixed_per_booking",
      feesDeclaredAt: new Date("2030-01-01T00:00:00Z"),
      mandatoryChargeDisclosureStatus: "none",
      pricingTrustStatus: "owner_provided",
      pricingVerifiedAt: new Date("2030-01-01T00:00:00Z"),
      pricingValidUntil: new Date("2030-12-31T00:00:00Z"),
      availabilityTrustStatus: "owner_provided",
      availabilityVerifiedAt: new Date("2030-01-01T00:00:00Z"),
      availabilityValidUntil: new Date("2030-12-31T00:00:00Z"),
    },
    availability: [
      {
        date: checkIn,
        available: true,
        capacity: 2,
        reserved: "0",
        price: 1000,
        priceSource: "base",
      },
    ],
  });
  assert(
    extraPax.ok && extraPax.quote.subtotal === 2100,
    "extra-pax charge applies after capacity-adjusted included pax",
  );
}

async function createFixture() {
  const owner = await user(`${prefix}-owner@example.test`, "Phase 4 Owner");
  const guestA = await user(
    `${prefix}-guest-a@example.test`,
    "Phase 4 Guest A",
  );
  const guestB = await user(
    `${prefix}-guest-b@example.test`,
    "Phase 4 Guest B",
  );
  const business = await db.execute<{ id: string }>(sql`
    insert into businesses (owner_id, display_name) values (${owner}::uuid, 'Search 2 Phase 4 Business') returning id::text
  `);
  const listing = await db.execute<{ id: string }>(sql`
    insert into listings (business_id, slug, name, category, description, status, booking_mode, downpayment_pct)
    values (${business.rows[0]!.id}::uuid, ${listingSlug}, 'Search 2 Phase 4 Fixture', 'room', 'Fixture used only by the Search 2.0 Phase 4 verifier.', 'published', 'inquiry', 50)
    returning id::text
  `);
  const rate = await db.execute<{ id: string }>(sql`
    insert into rate_plans (
      listing_id, name, type, price, price_unit, billing_period, billing_unit,
      included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label,
      available_quantity, min_pax, max_pax, quote_eligibility, mandatory_fee,
      mandatory_fee_basis, fees_declared_at, mandatory_charge_disclosure_status, pricing_trust_status,
      pricing_valid_until, availability_trust_status, availability_valid_until, active
    ) values (
      ${listing.rows[0]!.id}::uuid, 'Verifier room', 'day_use', 10000, 'per_group', 'day', 'inventory_unit',
      2, 500, 2, 'room', 2, 1, 8, 'eligible', 0, 'fixed_per_booking', now(), 'none', 'owner_provided',
      now() + interval '30 days', 'owner_provided', now() + interval '7 days', true
    ) returning id::text
  `);
  const moreExpensiveRate = await db.execute<{ id: string }>(sql`
    insert into rate_plans (
      listing_id, name, type, price, price_unit, billing_period, billing_unit,
      included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label,
      available_quantity, min_pax, max_pax, quote_eligibility, mandatory_fee,
      mandatory_fee_basis, fees_declared_at, mandatory_charge_disclosure_status, pricing_trust_status,
      pricing_valid_until, availability_trust_status, availability_valid_until, active
    ) values (
      ${listing.rows[0]!.id}::uuid, 'Verifier premium room', 'day_use', 11000, 'per_group', 'day', 'inventory_unit',
      2, 500, 2, 'room', 2, 1, 8, 'eligible', 0, 'fixed_per_booking', now(), 'none', 'owner_provided',
      now() + interval '30 days', 'owner_provided', now() + interval '7 days', true
    ) returning id::text
  `);
  return {
    listingId: listing.rows[0]!.id,
    ratePlanId: rate.rows[0]!.id,
    moreExpensiveRatePlanId: moreExpensiveRate.rows[0]!.id,
    guestA,
    guestB,
  };
}

async function verifyDatabaseQuoteAndOverrides(fixture: {
  listingId: string;
  ratePlanId: string;
  moreExpensiveRatePlanId: string;
}) {
  const base = await getAuthoritativeQuote({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn,
    checkOut,
    pax: 3,
  });
  assert(base.ok, "structured rate produces an authoritative database quote");
  if (!base.ok) return;
  assert(
    base.quote.requiredUnits === 2,
    "capacity derives the required room count",
  );
  assert(
    base.quote.subtotal === 20_000,
    "base price and included pax use explicit dimensions",
  );
  const discovery = await getCheapestAuthoritativeQuote({
    listingId: fixture.listingId,
    ratePlanIds: [fixture.moreExpensiveRatePlanId, fixture.ratePlanId],
    checkIn,
    checkOut,
    pax: 3,
  });
  assert(
    discovery.ok && discovery.quote.ratePlanId === fixture.ratePlanId,
    "Search/Map adapter selects the cheapest eligible canonical quote",
  );
  await db.execute(sql`
    insert into availability_blocks (listing_id, rate_plan_id, date, available, quantity, price_override)
    values (${fixture.listingId}::uuid, ${fixture.ratePlanId}::uuid, ${checkIn}::date, true, 1, 12000)
  `);
  await db.execute(sql`
    update rate_plans set mandatory_fee = 500, mandatory_fee_label = 'Environmental fee',
      mandatory_charge_disclosure_status = 'itemized', fees_declared_at = now()
    where id = ${fixture.ratePlanId}::uuid
  `);
  const overridden = await getAuthoritativeQuote({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn,
    checkOut,
    pax: 2,
    requestedUnits: 1,
  });
  assert(
    overridden.ok && overridden.quote.subtotal === 12_500,
    "rate-date override and disclosed mandatory fee control the exact total",
  );
  assert(
    overridden.ok &&
      overridden.quote.breakdown[0]?.priceSource === "rate_override",
    "quote records override provenance",
  );
  assert(
    overridden.ok &&
      overridden.quote.mandatoryFee.label === "Environmental fee",
    "quote itemizes the disclosed mandatory fee",
  );
  await db.execute(sql`
    update rate_plans
    set pricing_trust_status = 'verified', pricing_verified_at = null,
      availability_trust_status = 'verified', availability_verified_at = null
    where id = ${fixture.ratePlanId}::uuid
  `);
  const missingVerificationTime = await getAuthoritativeQuote({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn,
    checkOut,
    pax: 2,
    requestedUnits: 1,
  });
  assert(
    missingVerificationTime.ok &&
      !missingVerificationTime.quote.trust.verifiedTotalEligible,
    "verified-total eligibility requires recorded verification timestamps",
  );
}

async function verifyUnknownAndAmbiguousRejections(fixture: {
  listingId: string;
  ratePlanId: string;
}) {
  await db.execute(
    sql`update rate_plans set available_quantity = null where id = ${fixture.ratePlanId}::uuid`,
  );
  const unknown = await getAuthoritativeQuote({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn,
    checkOut,
    pax: 2,
  });
  assert(
    !unknown.ok && unknown.rejections[0]?.code === "RATE_DATA_INCOMPLETE",
    "unknown inventory cannot pass an exact quote",
  );
  await db.execute(
    sql`update rate_plans set available_quantity = 1, quote_eligibility = 'legacy_ambiguous' where id = ${fixture.ratePlanId}::uuid`,
  );
  const ambiguous = await getAuthoritativeQuote({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn,
    checkOut,
    pax: 2,
  });
  assert(
    !ambiguous.ok && ambiguous.rejections[0]?.code === "RATE_AMBIGUOUS",
    "ambiguous legacy semantics cannot quote",
  );
  await db.execute(
    sql`update rate_plans set quote_eligibility = 'eligible' where id = ${fixture.ratePlanId}::uuid`,
  );
}

async function verifyTransactionalReservationAndSnapshot(fixture: {
  listingId: string;
  ratePlanId: string;
  guestA: string;
  guestB: string;
}) {
  await db.execute(
    sql`update rate_plans set available_quantity = 1 where id = ${fixture.ratePlanId}::uuid`,
  );
  const input = (email: string) => ({
    listingId: fixture.listingId,
    ratePlanId: fixture.ratePlanId,
    checkIn,
    checkOut,
    pax: 2,
    requestedUnits: 1,
    guestName: "Phase 4 Guest",
    guestPhone: "+639180000000",
    guestEmail: email,
  });
  const attempts = await Promise.allSettled([
    createInquiryBooking(
      input(`${prefix}-reservation-a@example.test`),
      fixture.guestA,
    ),
    createInquiryBooking(
      input(`${prefix}-reservation-b@example.test`),
      fixture.guestB,
    ),
  ]);
  assert(
    attempts.filter((item) => item.status === "fulfilled").length === 1,
    "concurrent requests cannot over-reserve the last unit",
  );
  const successful = attempts.find(
    (
      item,
    ): item is PromiseFulfilledResult<
      Awaited<ReturnType<typeof createInquiryBooking>>
    > => item.status === "fulfilled",
  );
  assert(
    Boolean(successful?.value),
    "one booking is stored after the concurrent request proof",
  );
  const bookingId = successful!.value!.id;
  const stored = await db.execute<{
    subtotal: number;
    quote_snapshot: unknown;
    reserved_units: number;
  }>(sql`
    select subtotal, quote_snapshot, reserved_units from bookings where id = ${bookingId}::uuid
  `);
  assert(
    stored.rows[0]?.reserved_units === 1 &&
      stored.rows[0]?.quote_snapshot !== null,
    "new bookings persist a unit reservation and immutable quote snapshot",
  );
  const reservation = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from inventory_reservations where booking_id = ${bookingId}::uuid
  `);
  assert(
    Number(reservation.rows[0]?.count) === 1,
    "a reservation row is stored for every service date",
  );
  const subtotal = stored.rows[0]!.subtotal;
  await db.execute(
    sql`update rate_plans set price = 99000 where id = ${fixture.ratePlanId}::uuid`,
  );
  const unchanged = await db.execute<{ subtotal: number }>(
    sql`select subtotal from bookings where id = ${bookingId}::uuid`,
  );
  assert(
    unchanged.rows[0]?.subtotal === subtotal,
    "existing booking financial meaning remains immutable after a rate edit",
  );
}

async function user(email: string, name: string) {
  const result = await db.execute<{ id: string }>(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values (${email}, ${name}, 'user', 'email', now())
    returning id::text
  `);
  return result.rows[0]!.id;
}

async function reset() {
  await db.execute(
    sql`delete from inventory_reservations where listing_id in (select id from listings where slug = ${listingSlug})`,
  );
  await db.execute(
    sql`delete from bookings where listing_id in (select id from listings where slug = ${listingSlug})`,
  );
  await db.execute(
    sql`delete from availability_blocks where listing_id in (select id from listings where slug = ${listingSlug})`,
  );
  await db.execute(
    sql`delete from rate_plan_review_items where listing_id in (select id from listings where slug = ${listingSlug})`,
  );
  await db.execute(
    sql`delete from rate_plans where listing_id in (select id from listings where slug = ${listingSlug})`,
  );
  await db.execute(sql`delete from listings where slug = ${listingSlug}`);
  await db.execute(
    sql`delete from businesses where display_name = 'Search 2 Phase 4 Business'`,
  );
  await db.execute(
    sql`delete from users where email like ${`${prefix}-%@example.test`}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

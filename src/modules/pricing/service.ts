import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { uuidSchema } from "@/lib/validation";

export const pricingQuoteVersion = "search2-phase4-v1";
export const billingPeriods = ["once", "night", "day", "hour"] as const;
export const billingUnits = ["inventory_unit", "person", "group"] as const;
export type BillingPeriod = (typeof billingPeriods)[number];
export type BillingUnit = (typeof billingUnits)[number];

export const quoteRequestSchema = z.object({
  listingId: uuidSchema,
  ratePlanId: uuidSchema,
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  pax: z.coerce.number().int().min(1).max(999),
  requestedUnits: z.coerce.number().int().min(1).max(999).optional(),
  durationHours: z.coerce.number().int().min(1).max(24).optional(),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export type QuoteRejectionCode =
  | "RATE_NOT_FOUND"
  | "RATE_AMBIGUOUS"
  | "RATE_DATA_INCOMPLETE"
  | "FEES_UNDISCLOSED"
  | "TRUST_OR_FRESHNESS_REQUIRED"
  | "DATES_IN_PAST"
  | "INVALID_DATE_RANGE"
  | "DURATION_REQUIRED"
  | "INVALID_DURATION"
  | "PAX_OUT_OF_RANGE"
  | "REQUESTED_UNITS_TOO_LOW"
  | "AVAILABILITY_UNKNOWN"
  | "UNAVAILABLE";

export type QuoteRejection = { code: QuoteRejectionCode; message: string };

export type QuoteLine = {
  date: string;
  baseAmount: number;
  extraPaxAmount: number;
  units: number;
  priceSource: "base" | "rate_override" | "listing_override";
};

export type AuthoritativeQuote = {
  quoteVersion: typeof pricingQuoteVersion;
  listingId: string;
  ratePlanId: string;
  ratePlanName: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  requestedUnits: number | null;
  requiredUnits: number;
  reservedUnits: number;
  durationHours: number | null;
  currency: "PHP";
  subtotal: number;
  downpaymentAmount: number;
  balanceDue: number;
  nights: number;
  days: number;
  cancellationPolicy: "flexible" | "moderate" | "strict";
  billing: {
    period: BillingPeriod;
    unit: BillingUnit;
    basePrice: number;
    includedPax: number;
    extraPaxCharge: number;
    capacityPerUnit: number;
    inventoryUnitLabel: string;
  };
  mandatoryFee: { amount: number; label: string | null };
  trust: {
    pricing: string;
    availability: string;
    verifiedTotalEligible: boolean;
    warnings: string[];
  };
  breakdown: QuoteLine[];
  availabilityEvidence: Array<{
    date: string;
    capacity: number;
    reserved: number;
    available: boolean;
  }>;
};

export type QuoteResult =
  | { ok: true; quote: AuthoritativeQuote; serviceDates: string[] }
  | { ok: false; rejections: QuoteRejection[] };

/**
 * The portion of a quote request that a discovery surface may collect. A
 * listing and rate plan remain server-selected so the browser cannot turn a
 * displayed starting price into an authoritative quote.
 */
export type QuoteContext = Omit<QuoteRequest, "listingId" | "ratePlanId">;

type QuoteExecutor = { execute: typeof db.execute };
type RateRow = {
  listingId: string;
  ratePlanId: string;
  ratePlanName: string;
  bookingMode: "inquiry" | "instant" | "none";
  cancellationPolicy: "flexible" | "moderate" | "strict";
  downpaymentPct: number;
  price: number;
  billingPeriod: BillingPeriod | null;
  billingUnit: BillingUnit | null;
  includedPax: number | null;
  extraPaxCharge: number | null;
  capacityPerUnit: number | null;
  inventoryUnitLabel: string | null;
  availableQuantity: number | null;
  minPax: number;
  maxPax: number | null;
  quoteEligibility: string;
  mandatoryFee: number | null;
  mandatoryFeeLabel: string | null;
  mandatoryFeeBasis: "unmodeled" | "fixed_per_booking";
  feesDeclaredAt: Date | null;
  mandatoryChargeDisclosureStatus: "undisclosed" | "none" | "itemized";
  pricingTrustStatus: string;
  pricingVerifiedAt: Date | null;
  pricingValidUntil: Date | null;
  availabilityTrustStatus: string;
  availabilityVerifiedAt: Date | null;
  availabilityValidUntil: Date | null;
};
type AvailabilityRow = {
  date: string;
  available: boolean | null;
  capacity: number | null;
  reserved: string;
  price: number | null;
  priceSource: "base" | "rate_override" | "listing_override" | null;
  /** True only when a rate- or listing-level row explicitly covers the date. */
  hasExplicitCoverage?: boolean;
};

export class QuoteRejectedError extends Error {
  constructor(readonly rejections: QuoteRejection[]) {
    super(rejections.map((item) => item.message).join(" "));
    this.name = "QuoteRejectedError";
  }
}

function manilaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function dateDiff(start: string, end: string) {
  return Math.round(
    (new Date(`${end}T00:00:00.000Z`).getTime() -
      new Date(`${start}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

function dateRange(start: string, count: number) {
  return Array.from({ length: count }, (_, offset) => {
    const value = new Date(`${start}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  });
}

function rejection(code: QuoteRejectionCode, message: string): QuoteResult {
  return { ok: false, rejections: [{ code, message }] };
}

function quoteTrust(rate: RateRow) {
  const currentVerified = (
    status: string,
    verifiedAt: Date | null,
    validUntil: Date | null,
  ) => {
    const verified = verifiedAt ? new Date(verifiedAt) : null;
    const valid = validUntil ? new Date(validUntil) : null;
    return (
      (status === "verified" || status === "team_verified") &&
      verified !== null &&
      valid !== null &&
      !Number.isNaN(verified.getTime()) &&
      !Number.isNaN(valid.getTime()) &&
      valid.getTime() >= verified.getTime() &&
      valid.getTime() >= Date.now()
    );
  };
  const pricingFresh = currentVerified(
    rate.pricingTrustStatus,
    rate.pricingVerifiedAt,
    rate.pricingValidUntil,
  );
  const availabilityFresh = currentVerified(
    rate.availabilityTrustStatus,
    rate.availabilityVerifiedAt,
    rate.availabilityValidUntil,
  );
  const warnings = [] as string[];
  if (!pricingFresh)
    warnings.push(
      "Price details are owner-provided or need fresh verification.",
    );
  if (!availabilityFresh)
    warnings.push(
      "Availability is owner-provided or needs fresh verification.",
    );
  return {
    pricing: rate.pricingTrustStatus,
    availability: rate.availabilityTrustStatus,
    verifiedTotalEligible: pricingFresh && availabilityFresh,
    warnings,
  };
}

function serviceDatesFor(
  input: QuoteRequest,
  period: BillingPeriod,
): string[] | QuoteResult {
  const span = dateDiff(input.checkIn, input.checkOut);
  if (input.checkIn < manilaDate())
    return rejection("DATES_IN_PAST", "Check-in cannot be in the past.");
  if (span < 0)
    return rejection(
      "INVALID_DATE_RANGE",
      "Check-out cannot be before check-in.",
    );
  if (period === "night") {
    if (span < 1)
      return rejection(
        "INVALID_DATE_RANGE",
        "Nightly rates need at least one night.",
      );
    return dateRange(input.checkIn, span);
  }
  if (period === "hour") {
    if (!input.durationHours)
      return rejection(
        "DURATION_REQUIRED",
        "Enter the visit duration in whole hours.",
      );
    if (span !== 0)
      return rejection(
        "INVALID_DURATION",
        "Hourly visits must begin and end on the same Manila date.",
      );
    return [input.checkIn];
  }
  return dateRange(input.checkIn, Math.max(span, 1));
}

export function calculateQuoteFromEvidence(args: {
  input: QuoteRequest;
  rate: RateRow;
  availability: AvailabilityRow[];
}): QuoteResult {
  const { input, rate, availability } = args;
  if (!["eligible", "legacy_mapped"].includes(rate.quoteEligibility))
    return rejection(
      rate.quoteEligibility === "legacy_ambiguous"
        ? "RATE_AMBIGUOUS"
        : "RATE_DATA_INCOMPLETE",
      rate.quoteEligibility === "legacy_ambiguous"
        ? "This legacy rate needs admin review before it can provide a total."
        : "This rate is not approved for authoritative quoting.",
    );
  if (
    !rate.billingPeriod ||
    !rate.billingUnit ||
    rate.capacityPerUnit === null ||
    rate.availableQuantity === null ||
    rate.includedPax === null ||
    rate.extraPaxCharge === null ||
    !rate.inventoryUnitLabel
  )
    return rejection(
      "RATE_DATA_INCOMPLETE",
      "This rate is missing the capacity, inventory, or billing details required for an exact total.",
    );
  if (
    rate.mandatoryFee === null ||
    rate.mandatoryFeeBasis !== "fixed_per_booking" ||
    !rate.feesDeclaredAt ||
    rate.mandatoryChargeDisclosureStatus === "undisclosed" ||
    (rate.mandatoryChargeDisclosureStatus === "none" &&
      rate.mandatoryFee !== 0) ||
    (rate.mandatoryChargeDisclosureStatus === "itemized" &&
      !rate.mandatoryFeeLabel)
  )
    return rejection(
      "FEES_UNDISCLOSED",
      "The owner must confirm there are no mandatory charges beyond one fixed per-booking fee before this rate can provide an exact total.",
    );
  if (
    input.pax < rate.minPax ||
    (rate.maxPax !== null && input.pax > rate.maxPax)
  )
    return rejection(
      "PAX_OUT_OF_RANGE",
      "The party size is outside this rate's guest limits.",
    );

  const serviceDates = serviceDatesFor(input, rate.billingPeriod);
  if (!Array.isArray(serviceDates)) return serviceDates;
  const minimumUnits = Math.ceil(input.pax / rate.capacityPerUnit);
  if (input.requestedUnits !== undefined && input.requestedUnits < minimumUnits)
    return rejection(
      "REQUESTED_UNITS_TOO_LOW",
      `This party needs at least ${minimumUnits} ${rate.inventoryUnitLabel}.`,
    );
  const reservedUnits = Math.max(input.requestedUnits ?? 0, minimumUnits);
  if (availability.length !== serviceDates.length)
    return rejection(
      "AVAILABILITY_UNKNOWN",
      "Availability is incomplete for the selected dates.",
    );
  if (
    availability.some((row) => row.capacity === null || row.available === null)
  )
    return rejection(
      "AVAILABILITY_UNKNOWN",
      "Availability is not confirmed for every selected date.",
    );
  if (
    availability.some(
      (row) =>
        !row.available ||
        Number(row.reserved) + reservedUnits > Number(row.capacity),
    )
  )
    return rejection(
      "UNAVAILABLE",
      "The selected dates do not have enough inventory units.",
    );

  const occurrences =
    rate.billingPeriod === "hour" ? input.durationHours! : serviceDates.length;
  const extraPax = Math.max(0, input.pax - rate.includedPax * reservedUnits);
  const perOccurrenceBaseMultiplier =
    rate.billingUnit === "person" ? input.pax : reservedUnits;
  const quoteLines = availability.map((row) => {
    const periodOccurrences = rate.billingPeriod === "hour" ? occurrences : 1;
    const baseAmount =
      Number(row.price) * perOccurrenceBaseMultiplier * periodOccurrences;
    const extraPaxAmount = rate.extraPaxCharge! * extraPax * periodOccurrences;
    return {
      date: row.date,
      baseAmount,
      extraPaxAmount,
      units: reservedUnits,
      priceSource: row.priceSource!,
    } satisfies QuoteLine;
  });
  // Hourly pricing has exactly one service date. For all other periods, each
  // calendar service date is one billable occurrence.
  const subtotalBeforeFees = quoteLines.reduce(
    (total, line) => total + line.baseAmount + line.extraPaxAmount,
    0,
  );
  const subtotal = subtotalBeforeFees + rate.mandatoryFee;
  const downpaymentAmount = Math.min(
    subtotal,
    Math.max(0, Math.round((subtotal * rate.downpaymentPct) / 100)),
  );
  const span = dateDiff(input.checkIn, input.checkOut);
  return {
    ok: true,
    serviceDates,
    quote: {
      quoteVersion: pricingQuoteVersion,
      listingId: rate.listingId,
      ratePlanId: rate.ratePlanId,
      ratePlanName: rate.ratePlanName,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      pax: input.pax,
      requestedUnits: input.requestedUnits ?? null,
      requiredUnits: minimumUnits,
      reservedUnits,
      durationHours: input.durationHours ?? null,
      currency: "PHP",
      subtotal,
      downpaymentAmount,
      balanceDue: subtotal - downpaymentAmount,
      nights: rate.billingPeriod === "night" ? span : 0,
      days: rate.billingPeriod === "day" ? Math.max(span, 1) : 0,
      cancellationPolicy: rate.cancellationPolicy,
      billing: {
        period: rate.billingPeriod,
        unit: rate.billingUnit,
        basePrice: rate.price,
        includedPax: rate.includedPax,
        extraPaxCharge: rate.extraPaxCharge,
        capacityPerUnit: rate.capacityPerUnit,
        inventoryUnitLabel: rate.inventoryUnitLabel,
      },
      mandatoryFee: {
        amount: rate.mandatoryFee,
        label: rate.mandatoryFeeLabel,
      },
      trust: quoteTrust(rate),
      breakdown: quoteLines,
      availabilityEvidence: availability.map((row) => ({
        date: row.date,
        capacity: Number(row.capacity),
        reserved: Number(row.reserved),
        available: Boolean(row.available),
      })),
    },
  };
}

export async function getAuthoritativeQuote(
  rawInput: unknown,
  executor: QuoteExecutor = db,
  options?: {
    lockInventory?: boolean;
    expectedMode?: "inquiry" | "instant";
    requireVerifiedTotal?: boolean;
    /**
     * Discovery hard filters must not inherit the legacy checkout fallback
     * where a missing availability row means the base inventory is usable.
     */
    requireExplicitAvailabilityCoverage?: boolean;
  },
): Promise<QuoteResult> {
  const input = quoteRequestSchema.parse(rawInput);
  const rateResult = await executor.execute<RateRow>(sql`
    select l.id::text as "listingId", rp.id::text as "ratePlanId", rp.name as "ratePlanName",
      l.booking_mode as "bookingMode", l.cancellation_policy as "cancellationPolicy",
      l.downpayment_pct as "downpaymentPct", rp.price,
      rp.billing_period as "billingPeriod", rp.billing_unit as "billingUnit",
      rp.included_pax as "includedPax", rp.extra_pax_charge as "extraPaxCharge",
      rp.capacity_per_unit as "capacityPerUnit", rp.inventory_unit_label as "inventoryUnitLabel",
      rp.available_quantity as "availableQuantity", rp.min_pax as "minPax", rp.max_pax as "maxPax",
      rp.quote_eligibility as "quoteEligibility", rp.mandatory_fee as "mandatoryFee",
      rp.mandatory_fee_label as "mandatoryFeeLabel", rp.fees_declared_at as "feesDeclaredAt",
      rp.mandatory_fee_basis as "mandatoryFeeBasis",
      rp.mandatory_charge_disclosure_status as "mandatoryChargeDisclosureStatus",
      rp.pricing_trust_status as "pricingTrustStatus", rp.pricing_verified_at as "pricingVerifiedAt", rp.pricing_valid_until as "pricingValidUntil",
      rp.availability_trust_status as "availabilityTrustStatus", rp.availability_verified_at as "availabilityVerifiedAt", rp.availability_valid_until as "availabilityValidUntil"
    from listings l join rate_plans rp on rp.listing_id = l.id
    where l.id = ${input.listingId}::uuid and rp.id = ${input.ratePlanId}::uuid
      and l.status = 'published'::listing_status and rp.active = true
    limit 1
  `);
  const rate = rateResult.rows[0];
  if (!rate)
    return rejection(
      "RATE_NOT_FOUND",
      "Published listing or active rate plan not found.",
    );
  if (rate.bookingMode === "none")
    return rejection(
      "RATE_NOT_FOUND",
      "This listing does not accept bookings.",
    );
  if (options?.expectedMode && rate.bookingMode !== options.expectedMode)
    return rejection(
      "RATE_NOT_FOUND",
      `This listing is configured for ${rate.bookingMode} bookings.`,
    );
  if (options?.lockInventory)
    await executor.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.listingId}))`,
    );

  const dates = rate.billingPeriod
    ? serviceDatesFor(input, rate.billingPeriod)
    : [];
  if (!Array.isArray(dates)) return dates;
  if (dates.length === 0)
    return calculateQuoteFromEvidence({ input, rate, availability: [] });
  const availabilityResult = await executor.execute<AvailabilityRow>(sql`
    select requested.day::date::text as date,
      coalesce(rate_block.available, listing_block.available, true) as available,
      coalesce(rate_block.quantity, listing_block.quantity, ${rate.availableQuantity}) as capacity,
      coalesce(occupied.reserved_units, '0') as reserved,
      coalesce(rate_block.price_override, listing_block.price_override, ${rate.price}) as price,
      case when rate_block.price_override is not null then 'rate_override'
           when listing_block.price_override is not null then 'listing_override'
           else 'base' end as "priceSource",
      (rate_block.id is not null or listing_block.id is not null) as "hasExplicitCoverage"
    from unnest(array[${sql.join(
      dates.map((value) => sql`${value}::date`),
      sql`, `,
    )}]) as requested(day)
    left join availability_blocks rate_block on rate_block.listing_id = ${input.listingId}::uuid
      and rate_block.rate_plan_id = ${input.ratePlanId}::uuid and rate_block.date = requested.day
    left join availability_blocks listing_block on listing_block.listing_id = ${input.listingId}::uuid
      and listing_block.rate_plan_id is null and listing_block.date = requested.day
    left join lateral (
      select coalesce(sum(ir.units), 0)::text as reserved_units
      from inventory_reservations ir join bookings b on b.id = ir.booking_id
      where ir.listing_id = ${input.listingId}::uuid and ir.service_date = requested.day
        and b.status in ('requested'::booking_status, 'accepted'::booking_status, 'awaiting_payment'::booking_status, 'confirmed'::booking_status)
        and (listing_block.id is not null or ir.rate_plan_id = ${input.ratePlanId}::uuid)
    ) occupied on true
    order by requested.day
  `);
  const result = calculateQuoteFromEvidence({
    input,
    rate,
    availability: availabilityResult.rows,
  });
  if (
    result.ok &&
    options?.requireExplicitAvailabilityCoverage &&
    availabilityResult.rows.some((row) => !row.hasExplicitCoverage)
  )
    return rejection(
      "AVAILABILITY_UNKNOWN",
      "Availability needs an explicit record for every selected date.",
    );
  if (
    result.ok &&
    options?.requireVerifiedTotal &&
    !result.quote.trust.verifiedTotalEligible
  )
    return rejection(
      "TRUST_OR_FRESHNESS_REQUIRED",
      "This exact quote is owner-provided but not fresh verified evidence for a verified-price filter.",
    );
  return result;
}

/**
 * Finds the least expensive eligible rate for a single, already-public
 * listing. Discovery callers must pass rate IDs obtained server-side from the
 * listing query; every candidate is still re-authorized by the canonical
 * quote function before it can be displayed.
 */
export async function getCheapestAuthoritativeQuote(
  args: QuoteContext & { listingId: string; ratePlanIds: string[] },
  executor: QuoteExecutor = db,
  options?: {
    requireVerifiedTotal?: boolean;
    requireExplicitAvailabilityCoverage?: boolean;
  },
): Promise<QuoteResult> {
  const ratePlanIds = [...new Set(args.ratePlanIds)].filter(Boolean);
  if (ratePlanIds.length === 0)
    return rejection(
      "RATE_NOT_FOUND",
      "This listing has no active rate plan for an exact total.",
    );

  const results: QuoteResult[] = [];
  for (const ratePlanId of ratePlanIds) {
    results.push(
      await getAuthoritativeQuote(
        {
          listingId: args.listingId,
          ratePlanId,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          pax: args.pax,
          requestedUnits: args.requestedUnits,
          durationHours: args.durationHours,
        },
        executor,
        options,
      ),
    );
  }

  const successful = results.filter(
    (result): result is Extract<QuoteResult, { ok: true }> => result.ok,
  );
  if (successful.length === 0)
    return (
      results.find((result) => !result.ok) ??
      rejection("RATE_NOT_FOUND", "No eligible rate plan was found.")
    );

  return successful.sort(
    (left, right) =>
      left.quote.subtotal - right.quote.subtotal ||
      left.quote.ratePlanId.localeCompare(right.quote.ratePlanId),
  )[0]!;
}

export async function requireAuthoritativeQuote(
  input: unknown,
  executor: QuoteExecutor = db,
  options?: {
    lockInventory?: boolean;
    expectedMode?: "inquiry" | "instant";
    requireVerifiedTotal?: boolean;
  },
) {
  const result = await getAuthoritativeQuote(input, executor, options);
  if (!result.ok) throw new QuoteRejectedError(result.rejections);
  return result;
}

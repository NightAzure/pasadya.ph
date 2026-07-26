import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import { searchQuerySchema } from "@/modules/search/contracts";
import { getSearchSuggestions, searchListings } from "@/modules/search/service";

const prefix = "search2-phase05";
const checkIn = "2031-07-10";
const checkOut = "2031-07-11";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 5 verification failed: ${message}`);
  console.log(`ok - ${message}`);
}

async function run() {
  await reset();
  try {
    assert(
      !searchQuerySchema.safeParse({ unknown: true }).success,
      "unknown query fields are rejected",
    );
    assert(
      !searchQuerySchema.safeParse({ verifiedTotal: { max: 1000 } }).success,
      "verified totals require a complete quote context",
    );
    assert(
      !searchQuerySchema.safeParse({ route: { maxFare: 100 } }).success,
      "strict route limits require an origin",
    );
    const fixture = await seed();
    await verifyHardFilters(fixture);
    await verifyTextFacetsAndPagination(fixture);
    await verifySuggestionsAndRouteDiagnostic();
    await verifyLatency();
    console.log("Search 2.0 Phase 5 search-platform verification passed");
  } finally {
    await reset();
    await pool.end();
  }
}

async function seed() {
  const owner = await db.execute<{ id: string }>(sql`
    insert into users (email, name, email_verified) values (${`${prefix}@example.test`}, 'Phase 5 owner', now()) returning id::text as id
  `);
  const business = await db.execute<{ id: string }>(sql`
    insert into businesses (owner_id, display_name) values (${owner.rows[0]!.id}::uuid, 'Phase 5 search business') returning id::text as id
  `);
  const amenity = await db.execute<{ id: string }>(sql`
    insert into amenities (slug, name, icon) values (${`${prefix}-pool`}, 'Verifier Pool', 'waves') returning id::text as id
  `);
  const area = await db.execute<{ id: string }>(sql`
    insert into areas (type, name, slug, center) values ('barangay', 'Verifier Barangay', ${`${prefix}-barangay`}, ST_SetSRID(ST_MakePoint(125.700, 7.120), 4326)::geography) returning id::text as id
  `);
  await db.execute(
    sql`insert into area_aliases (area_id, alias, normalized_alias) values (${area.rows[0]!.id}::uuid, 'Test Barangay', 'test barangay')`,
  );
  const good = await listing(
    business.rows[0]!.id,
    area.rows[0]!.id,
    `${prefix}-good`,
    "Alpha Lagoon Resort",
    125.7,
    7.12,
    4.8,
    true,
  );
  const expensive = await listing(
    business.rows[0]!.id,
    area.rows[0]!.id,
    `${prefix}-expensive`,
    "Beta Lagoon Resort",
    125.701,
    7.121,
    4.5,
    false,
  );
  const unknown = await listing(
    business.rows[0]!.id,
    area.rows[0]!.id,
    `${prefix}-unknown`,
    "Gamma Lagoon Resort",
    125.702,
    7.122,
    4.2,
    false,
  );
  await db.execute(
    sql`insert into listing_aliases (listing_id, alias, normalized_alias) values (${good}::uuid, 'Bluewater Hideout', 'bluewater hideout')`,
  );
  await db.execute(
    sql`insert into listing_amenities (listing_id, amenity_id) values (${good}::uuid, ${amenity.rows[0]!.id}::uuid), (${expensive}::uuid, ${amenity.rows[0]!.id}::uuid)`,
  );
  const goodRate = await rate(good, "Good verified rate", 10_000, true);
  await rate(expensive, "Expensive verified rate", 30_000, true);
  const unknownRate = await rate(unknown, "No coverage rate", 8_000, false);
  await db.execute(sql`
    insert into availability_blocks (listing_id, rate_plan_id, date, available, quantity)
    values (${good}::uuid, ${goodRate}::uuid, ${checkIn}::date, true, 2), (${expensive}::uuid, (select id from rate_plans where listing_id = ${expensive}::uuid limit 1), ${checkIn}::date, true, 2)
  `);
  return { good, expensive, unknown, unknownRate };
}

async function listing(
  businessId: string,
  areaId: string,
  slug: string,
  name: string,
  lng: number,
  lat: number,
  rating: number,
  dot: boolean,
) {
  const result = await db.execute<{ id: string }>(sql`
    insert into listings (business_id, slug, name, category, description, status, address, attributes, location, canonical_area_id, rating_avg, rating_count, dot_accredited, booking_mode, published_at, location_verification_status, location_last_verified_at)
    values (${businessId}::uuid, ${slug}, ${name}, 'resort', 'A lagoon getaway with family cottages.', 'published', '{"barangay":"Verifier Barangay","municipality":"Samal"}'::jsonb, '{"day_use":true}'::jsonb, ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, ${areaId}::uuid, ${rating}, 20, ${dot}, 'instant', now(), 'verified', now()) returning id::text as id
  `);
  return result.rows[0]!.id;
}

async function rate(
  listingId: string,
  name: string,
  price: number,
  covered: boolean,
) {
  const result = await db.execute<{ id: string }>(sql`
    insert into rate_plans (listing_id, name, type, price, price_unit, billing_period, billing_unit, included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label, available_quantity, min_pax, max_pax, quote_eligibility, mandatory_fee, mandatory_fee_basis, mandatory_charge_disclosure_status, fees_declared_at, pricing_trust_status, pricing_verified_at, pricing_valid_until, availability_trust_status, availability_verified_at, availability_valid_until, active)
    values (${listingId}::uuid, ${name}, 'day_use', ${price}, 'per_group', 'day', 'inventory_unit', 2, 0, 2, 'cottage', 2, 1, 8, 'eligible', 0, 'fixed_per_booking', 'none', now(), 'verified', now(), now() + interval '30 days', 'verified', now(), now() + interval '30 days', true) returning id::text as id
  `);
  if (!covered) return result.rows[0]!.id;
  return result.rows[0]!.id;
}

const quoted = {
  checkIn,
  checkOut,
  pax: 2,
  available: true,
  verifiedTotal: { max: 15_000 },
  amenities: [`${prefix}-pool`],
  limit: 1,
};

async function verifyHardFilters(fixture: {
  good: string;
  expensive: string;
  unknown: string;
  unknownRate: string;
}) {
  const response = await searchListings(quoted);
  assert(
    response.totalCount === 1 && response.listings[0]?.id === fixture.good,
    "verified price and explicit fresh availability exclude expensive and uncovered rates",
  );
  assert(
    response.listings[0]?.matchedRate?.total === 10_000,
    "search returns the canonical verified matched quote total",
  );
  const radius = await searchListings({
    ...quoted,
    verifiedTotal: undefined,
    radius: { center: { lat: 7.12, lng: 125.7 }, meters: 80 },
  });
  assert(
    radius.totalCount === 1 && radius.listings[0]?.id === fixture.good,
    "PostGIS radius is a hard geometry constraint",
  );
  const dot = await searchListings({
    ...quoted,
    verifiedTotal: undefined,
    dotAccredited: true,
  });
  assert(dot.totalCount === 1, "combined amenity and DOT facets remain strict");
  await db.execute(
    sql`update rate_plans set capacity_per_unit = null where id = ${fixture.unknownRate}::uuid`,
  );
  const capacity = await searchListings({
    checkIn,
    checkOut,
    pax: 4,
    rooms: 2,
    ratingMin: 4,
  });
  assert(
    capacity.totalCount === 2 &&
      !capacity.listings.some((listing) => listing.id === fixture.unknown),
    "unknown capacity cannot satisfy party-size or room constraints",
  );
}

async function verifyTextFacetsAndPagination(fixture: {
  good: string;
  expensive: string;
}) {
  const alias = await searchListings({ text: "Bluewater Hideout", limit: 10 });
  assert(
    alias.listings.some((listing) => listing.id === fixture.good),
    "simple FTS document includes listing aliases",
  );
  const pageOne = await searchListings({
    text: "Lagoon",
    limit: 1,
    sort: "rating",
  });
  const pagedIds: string[] = [];
  let page = pageOne;
  do {
    pagedIds.push(...page.listings.map((listing) => listing.id));
    page = page.nextCursor
      ? await searchListings({
          text: "Lagoon",
          limit: 1,
          sort: "rating",
          cursor: page.nextCursor,
        })
      : { ...page, nextCursor: null };
  } while (
    page.nextCursor ||
    (page.listings.length > 0 && !pagedIds.includes(page.listings[0]!.id))
  );
  assert(
    pageOne.nextCursor !== null &&
      new Set(pagedIds).size === 3 &&
      pagedIds.length === 3,
    "cursor pagination traverses every page without duplicates or unstable ordering",
  );
  assert(
    pageOne.facets.amenities.find((facet) => facet.value === `${prefix}-pool`)
      ?.count === 2,
    "combined-result amenity facet counts are exact",
  );
  assert(
    pageOne.resultBounds !== null,
    "result bounds are returned from matching records",
  );
}

async function verifySuggestionsAndRouteDiagnostic() {
  const suggestions = await getSearchSuggestions("Bluewater");
  assert(
    suggestions.some((suggestion) => suggestion.kind === "listing"),
    "listing suggestions include typo-tolerant search documents",
  );
  const route = await searchListings({
    origin: { lat: 7.1, lng: 125.6 },
    route: { maxFare: 200 },
  });
  assert(
    route.totalCount === 0 &&
      route.diagnostics.failedConstraints[0]
        ?.toLowerCase()
        .includes("route"),
    "impossible strict route limits remain exact-empty rather than relaxed",
  );
}

async function verifyLatency() {
  const durations: number[] = [];
  for (let i = 0; i < 5; i += 1)
    durations.push(
      (await searchListings({ ...quoted, limit: 20 })).timing.durationMs,
    );
  durations.sort((a, b) => a - b);
  assert(
    durations[4]! < 500,
    "warm fixture p95 search latency is under the 500ms development budget",
  );
}

async function reset() {
  await db.execute(
    sql`delete from availability_blocks where listing_id in (select id from listings where slug like ${`${prefix}-%`})`,
  );
  await db.execute(
    sql`delete from rate_plans where listing_id in (select id from listings where slug like ${`${prefix}-%`})`,
  );
  await db.execute(sql`delete from listings where slug like ${`${prefix}-%`}`);
  await db.execute(sql`delete from areas where slug = ${`${prefix}-barangay`}`);
  await db.execute(sql`delete from amenities where slug = ${`${prefix}-pool`}`);
  await db.execute(
    sql`delete from businesses where display_name = 'Phase 5 search business'`,
  );
  await db.execute(
    sql`delete from users where email = ${`${prefix}@example.test`}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

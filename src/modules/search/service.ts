import { sql, type SQL } from "drizzle-orm";

import { db } from "@/db/client";
import {
  decodeCursor,
  encodeCursor,
  queryFingerprint,
  searchQuerySchema,
  type SearchQuery,
  type SearchResponse,
  type SearchSuggestion,
} from "@/modules/search/contracts";
import {
  getCachedSearch,
  isSearchCacheable,
  setCachedSearch,
} from "@/modules/search/cache";
import { SEARCH_MAX_CANDIDATES } from "@/modules/search/hardening";
import {
  logSearchOperational,
  recordSearchApiFromQuery,
} from "@/modules/search/observability";
import {
  getCheapestAuthoritativeQuote,
  type QuoteResult,
} from "@/modules/pricing/service";
import {
  batchRouteSummaries,
  type RouteSummary,
} from "@/modules/transport/graph";

type Candidate = {
  id: string;
  slug: string;
  name: string;
  category: "resort" | "room" | "restaurant" | "activity" | "service";
  area: string | null;
  ratingAvg: string | number;
  ratingCount: number;
  bookingMode: "inquiry" | "instant" | "none";
  cancellationPolicy: "flexible" | "moderate" | "strict";
  attributes: unknown;
  dotAccredited: boolean;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  imageCaption: string | null;
  startingPrice: number | null;
  startingRateName: string | null;
  startingPriceUnit: string | null;
  startingPriceTrust:
    | "verified"
    | "team_verified"
    | "owner_provided"
    | "estimated"
    | "stale"
    | "unknown"
    | null;
  publishedAt: number | null;
  distanceM: number | null;
  relevance: string | number;
  freshness: number;
  amenities: string[] | null;
  ratePlans: unknown;
};

type CandidateWithEvidence = Candidate & {
  quote: Extract<QuoteResult, { ok: true }> | null;
  quoteRejection: string | null;
  warnings: string[];
  route: RouteSummary | null;
  score: number;
  sortKey: [number, string, string];
};

const priceBands = [
  { min: 0, max: 5_000 },
  { min: 5_001, max: 15_000 },
  { min: 15_001, max: 50_000 },
  { min: 50_001, max: 10_000_000 },
];

/**
 * Search 2.0's backend contract. It deliberately does not share the legacy
 * `/search` URL parser: callers submit a bounded typed payload and the service
 * keeps exact quote/availability evidence on the server.
 */
export async function searchListings(
  rawQuery: unknown,
): Promise<SearchResponse> {
  const started = performance.now();
  const query = searchQuerySchema.parse(rawQuery);
  const fingerprint = queryFingerprint(query);
  const cursor = query.cursor ? decodeCursor(query.cursor, fingerprint) : null;

  const cached = getCachedSearch(query);
  if (cached) {
    recordSearchApiFromQuery({
      query,
      ok: true,
      durationMs: 0,
      cache: "hit",
      zeroResult: cached.response.totalCount === 0,
      candidateCount: cached.response.diagnostics.candidateCount,
      resultCount: cached.response.totalCount,
      unknownPriceExposure: countUnknownPrice(cached.response),
      unknownRouteExposure: countUnknownRoute(cached.response, query),
    });
    return cached.response;
  }

  const candidateStarted = performance.now();
  const { rows: candidates, capReached } = await findCandidates(query);
  const candidateMs = performance.now() - candidateStarted;
  const quoteStarted = performance.now();
  const evaluated = (
    await Promise.all(
      candidates.map((candidate) => evaluateCandidate(candidate, query)),
    )
  ).filter((candidate): candidate is CandidateWithEvidence => candidate !== null);
  const quoteMs = performance.now() - quoteStarted;

  const routeStarted = performance.now();
  const routed = await attachRoutes(evaluated, query);
  const routeMs = performance.now() - routeStarted;
  const exact = routed.filter((candidate) => passesRouteFilters(candidate, query));

  const ordered = exact.sort(compareCandidates);
  const afterCursor = cursor
    ? ordered.filter(
        (candidate) => compareTuple(candidate.sortKey, cursor.key) > 0,
      )
    : ordered;
  const page = afterCursor.slice(0, query.limit);
  const next = afterCursor.length > page.length ? page.at(-1) : null;
  const resultBounds = boundsFor(exact);
  const durationMs = Math.round(performance.now() - started);
  const failedConstraints =
    exact.length === 0 ? diagnoseEmpty(query, candidates.length) : [];

  const cacheState = isSearchCacheable(query) ? "miss" : "bypass";
  const response: SearchResponse = {
    listings: page.map((candidate) => toResponseListing(candidate, query)),
    facets: facetsFor(exact),
    totalCount: exact.length,
    resultBounds,
    nextCursor: next
      ? encodeCursor({ v: 1, fingerprint, key: next.sortKey })
      : null,
    diagnostics: {
      exact: true,
      failedConstraints,
      candidateCount: candidates.length,
      candidateCapReached: capReached,
    },
    timing: {
      durationMs,
      candidateMs: Math.round(candidateMs),
      quoteMs: Math.round(quoteMs + routeMs),
      cache: cacheState,
    },
  };

  setCachedSearch(query, response);
  recordSearchApiFromQuery({
    query,
    ok: true,
    durationMs,
    cache: cacheState,
    zeroResult: response.totalCount === 0,
    candidateCount: candidates.length,
    resultCount: response.totalCount,
    unknownPriceExposure: countUnknownPrice(response),
    unknownRouteExposure: countUnknownRoute(response, query),
  });
  logSearchOperational({
    message: "search_evaluated",
    details: {
      durationMs,
      cache: cacheState,
      resultCount: response.totalCount,
      candidateCount: candidates.length,
      candidateCapReached: capReached,
      routeAware: Boolean(query.origin),
    },
  });

  return response;
}

export async function getSearchSuggestions(
  rawText: unknown,
  limit = 8,
): Promise<SearchSuggestion[]> {
  const text = typeof rawText === "string" ? rawText.trim().slice(0, 120) : "";
  if (!text) return categorySuggestions();
  const like = `%${text}%`;
  const result = await db.execute<{
    kind: SearchSuggestion["kind"];
    label: string;
    value: string;
    detail: string | null;
    rank: number;
  }>(sql`
    with suggestions as (
      select 'listing'::text as kind, l.name as label, l.slug as value,
        coalesce(a.name, l.address ->> 'barangay', l.address ->> 'municipality') as detail,
        greatest(similarity(l.name, ${text}), case when lower(l.name) = lower(${text}) then 1 else 0 end) as rank
      from listings l left join areas a on a.id = l.canonical_area_id
        left join listing_aliases lsa on lsa.listing_id = l.id
      where l.status = 'published' and (l.name ilike ${like} or lsa.alias ilike ${like} or similarity(l.name, ${text}) > .18 or similarity(coalesce(lsa.alias, ''), ${text}) > .18)
      union all
      select 'area'::text, a.name, a.slug, a.type::text,
        greatest(similarity(a.name, ${text}), similarity(coalesce(aa.alias, ''), ${text}))
      from areas a left join area_aliases aa on aa.area_id = a.id
      where a.name ilike ${like} or aa.alias ilike ${like} or similarity(a.name, ${text}) > .18 or similarity(coalesce(aa.alias, ''), ${text}) > .18
      union all
      select 'stop'::text, rs.name, rs.id::text, tr.name,
        greatest(similarity(rs.name, ${text}), case when lower(rs.name) = lower(${text}) then 1 else 0 end)
      from route_stops rs join transport_routes tr on tr.id = rs.route_id
      where tr.status = 'published' and (rs.name ilike ${like} or similarity(rs.name, ${text}) > .18)
    )
    select kind, label, value, detail, max(rank)::float as rank
    from suggestions group by kind, label, value, detail
    order by rank desc, label asc limit ${Math.min(Math.max(limit, 1), 20)}
  `);
  return [
    ...result.rows.map(({ kind, label, value, detail }) => ({
      kind,
      label,
      value,
      ...(detail ? { detail } : {}),
    })),
    ...categorySuggestions(text),
  ].slice(0, Math.min(Math.max(limit, 1), 20));
}

async function findCandidates(query: SearchQuery) {
  const conditions = buildConditions(query);
  const textRank = query.text
    ? sql`ts_rank_cd(l.search_vector_simple, websearch_to_tsquery('simple', ${query.text}))`
    : sql`0::real`;
  const originPoint = query.origin ?? query.radius?.center;
  const distance = originPoint
    ? sql`ST_Distance(l.location, ST_SetSRID(ST_MakePoint(${originPoint.lng}, ${originPoint.lat}), 4326)::geography)`
    : sql`null::double precision`;
  const result = await db.execute<Candidate>(sql`
    select l.id::text as id, l.slug, l.name, l.category, a.name as area,
      l.rating_avg as "ratingAvg", l.rating_count as "ratingCount", l.booking_mode as "bookingMode",
      l.cancellation_policy as "cancellationPolicy", l.attributes,
      l.dot_accredited as "dotAccredited", ST_Y(l.location::geometry) as latitude,
      ST_X(l.location::geometry) as longitude, extract(epoch from l.published_at) as "publishedAt", ${distance} as "distanceM",
      media.url as "imageUrl", media.caption as "imageCaption",
      starting.price as "startingPrice", starting.name as "startingRateName",
      starting.price_unit as "startingPriceUnit", starting.pricing_trust_status as "startingPriceTrust",
      ${textRank} as relevance,
      case when l.location_verification_status in ('verified', 'team_verified')
        and l.location_last_verified_at is not null then 1 else 0 end as freshness,
      coalesce((select array_agg(am.slug order by am.slug) from listing_amenities la join amenities am on am.id = la.amenity_id where la.listing_id = l.id), '{}'::text[]) as amenities,
      coalesce((select json_agg(json_build_object('id', rp.id::text, 'name', rp.name, 'type', rp.type) order by rp.price, rp.id)
        from rate_plans rp where rp.listing_id = l.id and rp.active
          ${
            query.rateTypes?.length
              ? sql`and rp.type::text in (${sql.join(
                  query.rateTypes.map((type) => sql`${type}`),
                  sql`, `,
                )})`
              : sql``
          }), '[]'::json) as "ratePlans"
    from listings l left join areas a on a.id = l.canonical_area_id
    left join lateral (
      select lm.url, lm.caption
      from listing_media lm
      where lm.listing_id = l.id and lm.type = 'photo'
      order by lm.sort_order asc
      limit 1
    ) media on true
    left join lateral (
      select rp.price, rp.name, rp.price_unit, rp.pricing_trust_status
      from rate_plans rp
      where rp.listing_id = l.id and rp.active
      order by rp.price asc, rp.id asc
      limit 1
    ) starting on true
    where ${sql.join(conditions, sql` and `)}
    order by ${textRank} desc, freshness desc, l.rating_avg desc, l.id asc
    limit ${SEARCH_MAX_CANDIDATES + 1}
  `);
  const capReached = result.rows.length > SEARCH_MAX_CANDIDATES;
  return {
    rows: capReached ? result.rows.slice(0, SEARCH_MAX_CANDIDATES) : result.rows,
    capReached,
  };
}

function countUnknownPrice(response: SearchResponse) {
  return response.listings.filter(
    (listing) =>
      !listing.matchedRate &&
      (!listing.startingPrice ||
        listing.startingPrice.trust === "unknown" ||
        listing.startingPrice.trust === "estimated" ||
        listing.startingPrice.trust === "stale"),
  ).length;
}

function countUnknownRoute(response: SearchResponse, query: SearchQuery) {
  if (!query.origin) return 0;
  return response.listings.filter((listing) => !listing.route).length;
}

function buildConditions(query: SearchQuery) {
  const conditions: SQL[] = [sql`l.status = 'published'::listing_status`];
  if (query.text) {
    const like = `%${query.text}%`;
    conditions.push(sql`(
      l.search_vector_simple @@ websearch_to_tsquery('simple', ${query.text})
      or similarity(l.name, ${query.text}) > .18
      or exists (select 1 from listing_aliases la where la.listing_id = l.id and (la.alias ilike ${like} or similarity(la.alias, ${query.text}) > .18))
      or exists (select 1 from areas ta left join area_aliases aa on aa.area_id = ta.id where ta.id = l.canonical_area_id and (ta.name ilike ${like} or aa.alias ilike ${like} or similarity(ta.name, ${query.text}) > .18 or similarity(coalesce(aa.alias, ''), ${query.text}) > .18))
    )`);
  }
  if (query.categories?.length)
    conditions.push(
      sql`l.category::text in (${sql.join(
        query.categories.map((value) => sql`${value}`),
        sql`, `,
      )})`,
    );
  if (query.area) {
    const like = `%${query.area}%`;
    conditions.push(sql`(
      lower(l.address ->> 'barangay') = lower(${query.area}) or lower(l.address ->> 'municipality') = lower(${query.area})
      or exists (select 1 from areas sa left join area_aliases saa on saa.area_id = sa.id where sa.id = l.canonical_area_id and (lower(sa.name) = lower(${query.area}) or lower(sa.slug) = lower(${query.area}) or lower(saa.alias) = lower(${query.area})))
      or (l.address ->> 'barangay') ilike ${like}
    )`);
  }
  if (query.bounds)
    conditions.push(
      sql`l.location is not null and ST_Covers(ST_MakeEnvelope(${query.bounds.west}, ${query.bounds.south}, ${query.bounds.east}, ${query.bounds.north}, 4326), l.location::geometry)`,
    );
  if (query.radius)
    conditions.push(
      sql`l.location is not null and ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(${query.radius.center.lng}, ${query.radius.center.lat}), 4326)::geography, ${query.radius.meters})`,
    );
  if (query.ratingMin !== undefined)
    conditions.push(sql`l.rating_avg >= ${query.ratingMin}`);
  if (query.bookingModes?.length)
    conditions.push(
      sql`l.booking_mode::text in (${sql.join(
        query.bookingModes.map((value) => sql`${value}`),
        sql`, `,
      )})`,
    );
  if (query.cancellationPolicies?.length)
    conditions.push(
      sql`l.cancellation_policy::text in (${sql.join(
        query.cancellationPolicies.map((value) => sql`${value}`),
        sql`, `,
      )})`,
    );
  if (query.dotAccredited) conditions.push(sql`l.dot_accredited = true`);
  if (query.locationTrust?.length)
    conditions.push(
      sql`l.location_verification_status::text in (${sql.join(
        query.locationTrust.map((value) => sql`${value}`),
        sql`, `,
      )})`,
    );
  if (query.rateTypes?.length)
    conditions.push(
      sql`exists (select 1 from rate_plans rp where rp.listing_id = l.id and rp.active and rp.type::text in (${sql.join(
        query.rateTypes.map((value) => sql`${value}`),
        sql`, `,
      )}))`,
    );
  for (const amenity of query.amenities ?? [])
    conditions.push(
      sql`exists (select 1 from listing_amenities la join amenities a on a.id = la.amenity_id where la.listing_id = l.id and a.slug = ${amenity})`,
    );
  for (const attribute of query.attributes ?? []) {
    if (typeof attribute.value === "string")
      conditions.push(
        sql`l.attributes -> ${attribute.key} ? ${attribute.value}`,
      );
    else
      conditions.push(
        sql`l.attributes ->> ${attribute.key} = ${String(attribute.value)}`,
      );
  }
  if (query.crowdLevels?.length)
    conditions.push(
      sql`coalesce((select cr.level::text from crowd_reports cr where cr.listing_id = l.id and cr.expires_at > now() order by cr.created_at desc limit 1), l.attributes ->> 'crowd_level') in (${sql.join(
        query.crowdLevels.map((value) => sql`${value}`),
        sql`, `,
      )})`,
    );
  if (query.visitAt) conditions.push(openAtCondition(query.visitAt));
  return conditions;
}

function openAtCondition(visitAt: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(visitAt));
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(visitAt));
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return sql`(
    exists (select 1 from listing_special_hours sh where sh.listing_id = l.id and sh.date = ${date}::date and not sh.is_closed and ${time}::time >= sh.opens_at and (${time}::time < sh.closes_at or sh.closes_at <= sh.opens_at))
    or (not exists (select 1 from listing_special_hours sh where sh.listing_id = l.id and sh.date = ${date}::date)
      and exists (select 1 from listing_opening_hours wh where wh.listing_id = l.id and wh.day_of_week = ${day} and not wh.is_closed and ${time}::time >= wh.opens_at and (${time}::time < wh.closes_at or wh.closes_at <= wh.opens_at)))
  )`;
}

async function evaluateCandidate(
  candidate: Candidate,
  query: SearchQuery,
): Promise<CandidateWithEvidence | null> {
  const needsQuote = Boolean(query.checkIn && query.checkOut && query.pax);
  let quote: Extract<QuoteResult, { ok: true }> | null = null;
  let quoteRejection: string | null = null;
  const warnings: string[] = [];
  if (needsQuote) {
    const rates = readRates(candidate.ratePlans);
    const result = await getCheapestAuthoritativeQuote(
      {
        listingId: candidate.id,
        ratePlanIds: rates.map((rate) => rate.id),
        checkIn: query.checkIn!,
        checkOut: query.checkOut!,
        pax: query.pax!,
        requestedUnits: query.rooms,
      },
      db,
      {
        requireExplicitAvailabilityCoverage: Boolean(
          query.available || query.verifiedTotal,
        ),
        requireVerifiedTotal: Boolean(query.available || query.verifiedTotal),
      },
    );
    if (result.ok) quote = result;
    else quoteRejection = result.rejections[0]?.code ?? "QUOTE_UNAVAILABLE";
    if (quote && !quote.quote.trust.verifiedTotalEligible)
      warnings.push(...quote.quote.trust.warnings);
  }
  if (
    (query.verifiedTotal || query.available || query.pax || query.rooms) &&
    !quote
  )
    return null;
  if (quote && query.verifiedTotal) {
    if (
      (query.verifiedTotal.min !== undefined &&
        quote.quote.subtotal < query.verifiedTotal.min) ||
      (query.verifiedTotal.max !== undefined &&
        quote.quote.subtotal > query.verifiedTotal.max)
    )
      return null;
  }
  if (candidate.latitude === null || candidate.longitude === null)
    warnings.push("Location is unavailable.");
  const score = scoreCandidate(candidate, quote, query, null);
  return {
    ...candidate,
    quote,
    quoteRejection,
    warnings,
    route: null,
    score,
    sortKey: sortKeyFor(candidate, quote, query, score),
  };
}

async function attachRoutes(
  candidates: CandidateWithEvidence[],
  query: SearchQuery,
): Promise<CandidateWithEvidence[]> {
  if (!query.origin) return candidates;
  const destinations = candidates.flatMap((candidate) =>
    candidate.latitude === null || candidate.longitude === null
      ? []
      : [
          {
            id: candidate.id,
            lat: candidate.latitude,
            lng: candidate.longitude,
          },
        ],
  );
  const summaries = await batchRouteSummaries(query.origin, destinations, {
    maxWalkingM: query.route?.maxWalkingM ?? 5_000,
  });
  return candidates.map((candidate) => {
    const route = summaries.get(candidate.id) ?? null;
    const warnings = [...candidate.warnings];
    if (!route)
      warnings.push(
        "No modeled route evidence is available from your origin to this place.",
      );
    else if (route.modeled)
      warnings.push(
        "Travel time is modeled when explicit schedules or segment timings are unavailable.",
      );
    else if (route.confidence === "low" || !route.lastVerifiedAt)
      warnings.push("Route evidence is low-confidence or unverified.");
    const score = scoreCandidate(candidate, candidate.quote, query, route);
    return {
      ...candidate,
      route,
      warnings,
      score,
      sortKey: sortKeyFor(candidate, candidate.quote, query, score),
    };
  });
}

function passesRouteFilters(
  candidate: CandidateWithEvidence,
  query: SearchQuery,
) {
  if (!hasRouteConstraint(query)) return true;
  const route = candidate.route;
  if (!route) return false;
  if (
    query.route?.maxDurationMin !== undefined &&
    route.durationMin > query.route.maxDurationMin
  )
    return false;
  if (
    query.route?.maxFare !== undefined &&
    Math.max(route.fareMin, route.fareMax) > query.route.maxFare
  )
    return false;
  if (
    query.route?.maxWalkingM !== undefined &&
    route.walkingM > query.route.maxWalkingM
  )
    return false;
  if (
    query.route?.maxTransfers !== undefined &&
    route.transfers > query.route.maxTransfers
  )
    return false;
  if (query.route?.modes?.length) {
    const rideModes = route.modes.filter((mode) => mode !== "walk");
    if (
      !rideModes.length ||
      rideModes.some((mode) => !query.route!.modes!.includes(mode as never))
    )
      return false;
  }
  return true;
}

function scoreCandidate(
  candidate: Candidate,
  quote: Extract<QuoteResult, { ok: true }> | null,
  query: SearchQuery,
  route: RouteSummary | null,
) {
  const relevance = Number(candidate.relevance) * 100;
  const reviewConfidence =
    Math.min(20, Math.log2(Number(candidate.ratingCount) + 1) * 5) +
    Number(candidate.ratingAvg) * 2;
  const availability = quote ? 15 : 0;
  const freshness = Number(candidate.freshness) * 5;
  const distance =
    candidate.distanceM === null
      ? 0
      : Math.max(0, 10 - candidate.distanceM / 2_000);
  const priceFit =
    quote && query.verifiedTotal?.max
      ? Math.max(0, 10 - (quote.quote.subtotal / query.verifiedTotal.max) * 10)
      : 0;
  // Origin alone boosts reachable places but never removes unknowns.
  const routeBoost =
    query.origin && route
      ? Math.max(0, 12 - route.durationMin / 20) +
        (route.confidence === "high" ? 3 : route.confidence === "medium" ? 1 : 0)
      : 0;
  return (
    relevance +
    availability +
    priceFit +
    distance +
    reviewConfidence +
    freshness +
    routeBoost
  );
}

function sortKeyFor(
  candidate: Candidate,
  quote: Extract<QuoteResult, { ok: true }> | null,
  query: SearchQuery,
  score: number,
): [number, string, string] {
  switch (query.sort) {
    case "rating":
      return [
        -Number(candidate.ratingAvg),
        candidate.name.toLocaleLowerCase(),
        candidate.id,
      ];
    case "verified_total":
      return [
        quote?.quote.subtotal ?? Number.MAX_SAFE_INTEGER,
        candidate.name.toLocaleLowerCase(),
        candidate.id,
      ];
    case "distance":
      return [
        candidate.distanceM ?? Number.MAX_SAFE_INTEGER,
        candidate.name.toLocaleLowerCase(),
        candidate.id,
      ];
    case "newest":
      return [
        -(candidate.publishedAt ?? 0),
        candidate.name.toLocaleLowerCase(),
        candidate.id,
      ];
    default:
      return [-score, candidate.name.toLocaleLowerCase(), candidate.id];
  }
}

function compareCandidates(
  left: CandidateWithEvidence,
  right: CandidateWithEvidence,
) {
  return compareTuple(left.sortKey, right.sortKey);
}
function compareTuple(
  left: [number, string, string],
  right: [number, string, string],
) {
  return (
    left[0] - right[0] ||
    left[1].localeCompare(right[1]) ||
    left[2].localeCompare(right[2])
  );
}

function toResponseListing(
  candidate: CandidateWithEvidence,
  query: SearchQuery,
): SearchResponse["listings"][number] {
  const quote = candidate.quote?.quote;
  const reasons = [] as string[];
  if (query.text) reasons.push("Matches your text search.");
  if (query.amenities?.length) reasons.push("Has all selected amenities.");
  if (quote)
    reasons.push("Has date-specific availability and capacity evidence.");
  return {
    id: candidate.id,
    slug: candidate.slug,
    name: candidate.name,
    category: candidate.category,
    area: candidate.area,
    image: candidate.imageUrl
      ? {
          url: candidate.imageUrl,
          alt: candidate.imageCaption ?? `${candidate.name} listing photo`,
        }
      : null,
    coordinates:
      candidate.latitude === null || candidate.longitude === null
        ? null
        : { lat: candidate.latitude, lng: candidate.longitude },
    bookingMode: candidate.bookingMode,
    startingPrice:
      candidate.startingPrice === null ||
      !candidate.startingRateName ||
      !candidate.startingPriceUnit ||
      !candidate.startingPriceTrust
        ? null
        : {
            amount: candidate.startingPrice,
            currency: "PHP",
            rateName: candidate.startingRateName,
            basis: candidate.startingPriceUnit,
            trust: candidate.startingPriceTrust,
          },
    rating: {
      average: Number(candidate.ratingAvg),
      count: candidate.ratingCount,
      confidence: Math.min(1, Math.log10(candidate.ratingCount + 1) / 2),
    },
    distanceM:
      candidate.distanceM === null ? null : Math.round(candidate.distanceM),
    matchedRate:
      quote && quote.trust.verifiedTotalEligible
        ? {
            id: quote.ratePlanId,
            name: quote.ratePlanName,
            total: quote.subtotal,
            currency: "PHP",
          }
        : null,
    availability: quote?.availabilityEvidence ?? [],
    route: candidate.route
      ? {
          durationMin: candidate.route.durationMin,
          fareMin: candidate.route.fareMin,
          fareMax: candidate.route.fareMax,
          walkingM: candidate.route.walkingM,
          transfers: candidate.route.transfers,
          modes: candidate.route.modes,
          firstMile: candidate.route.firstMile,
          lastMile: candidate.route.lastMile,
          confidence: candidate.route.confidence,
          lastVerifiedAt: candidate.route.lastVerifiedAt,
          modeled: candidate.route.modeled,
          source: candidate.route.source,
        }
      : null,
    matchReasons: reasons,
    dataWarnings: candidate.warnings,
  };
}

function facetsFor(
  candidates: CandidateWithEvidence[],
): SearchResponse["facets"] {
  const count = <T extends string>(values: T[]) =>
    [...new Set(values)].map((value) => ({
      value,
      count: values.filter((candidate) => candidate === value).length,
    }));
  const amenities = candidates.flatMap(
    (candidate) => candidate.amenities ?? [],
  );
  const rateTypes = candidates.flatMap((candidate) =>
    readRates(candidate.ratePlans).map((rate) => rate.type),
  );
  const cuisines = candidates.flatMap((candidate) =>
    readCuisineValues(candidate.attributes),
  );
  return {
    categories: count(candidates.map((candidate) => candidate.category)),
    amenities: count(amenities),
    rateTypes: count(rateTypes),
    bookingModes: count(candidates.map((candidate) => candidate.bookingMode)),
    cuisines: count(cuisines),
    cancellationPolicies: count(
      candidates.map((candidate) => candidate.cancellationPolicy),
    ),
    verifiedTotal: priceBands.map((band) => ({
      ...band,
      count: candidates.filter(
        (candidate) =>
          candidate.quote &&
          candidate.quote.quote.trust.verifiedTotalEligible &&
          candidate.quote.quote.subtotal >= band.min &&
          candidate.quote.quote.subtotal <= band.max,
      ).length,
    })),
  };
}

function boundsFor(candidates: CandidateWithEvidence[]) {
  const points = candidates.filter(
    (candidate) => candidate.latitude !== null && candidate.longitude !== null,
  );
  if (!points.length) return null;
  return {
    west: Math.min(...points.map((item) => item.longitude!)),
    south: Math.min(...points.map((item) => item.latitude!)),
    east: Math.max(...points.map((item) => item.longitude!)),
    north: Math.max(...points.map((item) => item.latitude!)),
  };
}

function hasRouteConstraint(query: SearchQuery) {
  return Boolean(
    query.route &&
    (query.route.required ||
      query.route.maxDurationMin !== undefined ||
      query.route.maxFare !== undefined ||
      query.route.maxWalkingM !== undefined ||
      query.route.maxTransfers !== undefined ||
      query.route.modes?.length),
  );
}
function diagnoseEmpty(query: SearchQuery, candidateCount: number) {
  if (hasRouteConstraint(query))
    return [
      "No listing has route evidence that satisfies the selected travel limits. Missing route data never passes a hard route filter.",
    ];
  if (candidateCount)
    return [
      "Listings matched the basic criteria but failed quote, availability, capacity, or verified-total evidence.",
    ];
  if (query.verifiedTotal)
    return ["No listing has a verified total within the selected budget."];
  if (query.available)
    return [
      "No listing has fresh, explicit availability for every selected date.",
    ];
  return ["No exact listings match these filters."];
}
function readCuisineValues(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const cuisine = (value as Record<string, unknown>).cuisine;
  if (Array.isArray(cuisine))
    return cuisine.filter((item): item is string => typeof item === "string");
  return typeof cuisine === "string" ? [cuisine] : [];
}
function readRates(
  value: unknown,
): Array<{ id: string; name: string; type: string }> {
  return Array.isArray(value)
    ? value.filter(
        (value): value is { id: string; name: string; type: string } =>
          Boolean(
            value &&
            typeof value === "object" &&
            "id" in value &&
            "name" in value &&
            "type" in value,
          ),
      )
    : [];
}
function categorySuggestions(text = ""): SearchSuggestion[] {
  return [
    ["resort", "Resorts"],
    ["room", "Rooms & stays"],
    ["restaurant", "Restaurants & cafes"],
    ["activity", "Activities"],
    ["service", "Services"],
  ]
    .filter(
      ([value, label]) =>
        !text ||
        value.includes(text.toLowerCase()) ||
        label.toLowerCase().includes(text.toLowerCase()),
    )
    .map(([value, label]) => ({ kind: "category", label, value }));
}

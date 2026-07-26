import {
  parseSearchParams,
  searchListings as legacySearchListings,
} from "@/modules/listings/search";
import type { SearchQuery } from "@/modules/search/contracts";
import { recordSearchMetric } from "@/modules/search/observability";

export type ShadowCompareResult = {
  comparable: boolean;
  reason?: string;
  overlapCount: number;
  v2OnlyCount: number;
  legacyOnlyCount: number;
  v2Slugs: string[];
  legacySlugs: string[];
  durationMs: number;
};

/**
 * Compares Search 2.0 exact result slugs against the legacy discovery search
 * for overlapping filter shapes. Origin/route/verified-total-only queries are
 * not comparable and are skipped rather than forced into a false mismatch.
 */
export async function compareSearchShadow(options: {
  query: SearchQuery;
  v2Slugs: string[];
}): Promise<ShadowCompareResult> {
  const started = performance.now();
  const mapped = mapComparableLegacyFilters(options.query);
  if (!mapped.ok) {
    return {
      comparable: false,
      reason: mapped.reason,
      overlapCount: 0,
      v2OnlyCount: 0,
      legacyOnlyCount: 0,
      v2Slugs: options.v2Slugs,
      legacySlugs: [],
      durationMs: Math.round(performance.now() - started),
    };
  }

  const legacy = await legacySearchListings({
    ...mapped.filters,
    limit: Math.min(options.query.limit, 50),
  });
  const legacySlugs = legacy.map((listing) => listing.slug);
  const v2Set = new Set(options.v2Slugs);
  const legacySet = new Set(legacySlugs);
  let overlapCount = 0;
  for (const slug of v2Set) if (legacySet.has(slug)) overlapCount += 1;
  const result: ShadowCompareResult = {
    comparable: true,
    overlapCount,
    v2OnlyCount: Math.max(v2Set.size - overlapCount, 0),
    legacyOnlyCount: Math.max(legacySet.size - overlapCount, 0),
    v2Slugs: options.v2Slugs,
    legacySlugs,
    durationMs: Math.round(performance.now() - started),
  };
  recordSearchMetric({
    type: "shadow_compare",
    overlapCount: result.overlapCount,
    v2OnlyCount: result.v2OnlyCount,
    legacyOnlyCount: result.legacyOnlyCount,
    durationMs: result.durationMs,
  });
  return result;
}

export function mapComparableLegacyFilters(query: SearchQuery):
  | { ok: true; filters: ReturnType<typeof parseSearchParams> }
  | { ok: false; reason: string } {
  if (query.origin || query.route || query.bounds || query.radius)
    return {
      ok: false,
      reason: "Origin, route, bounds, and radius are Search 2.0-only.",
    };
  if (query.verifiedTotal || query.available)
    return {
      ok: false,
      reason: "Verified-total and availability hard filters have no legacy peer.",
    };
  if (query.attributes?.length || query.rateTypes?.length)
    return {
      ok: false,
      reason: "Structured attributes and rate types are Search 2.0-only.",
    };

  const area =
    query.area === "Samal" || query.area === "samal"
      ? "samal"
      : query.area === "Davao City" || query.area === "davao-city"
        ? "davao-city"
        : undefined;

  const filters = parseSearchParams({
    q: query.text,
    category: query.categories?.[0],
    area,
    amenity: query.amenities,
    rating: query.ratingMin !== undefined ? String(query.ratingMin) : undefined,
    bookingMode: query.bookingModes?.[0],
    crowd: query.crowdLevels?.[0],
    dot: query.dotAccredited ? "1" : undefined,
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    pax: query.pax !== undefined ? String(query.pax) : undefined,
    requestedUnits: query.rooms !== undefined ? String(query.rooms) : undefined,
    sort:
      query.sort === "rating"
        ? "rating"
        : query.sort === "newest"
          ? "newest"
          : "relevance",
  });

  return { ok: true, filters };
}

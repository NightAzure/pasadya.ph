import type { SearchQuery } from "@/modules/search/contracts";

/**
 * Privacy contract for precise browser location (PD-032 / GAP-049).
 * Precise coordinates are permission-gated, session-only, never URL/history/
 * storage state, and never retained in analytics or structured logs.
 */
export const LOCATION_PRIVACY_DISCLOSURE =
  "Your precise location is used only for this search session. It is not saved to your account, URLs, or analytics. Choose a named area or stop instead if you prefer not to share it.";

export const LOCATION_PRIVACY_SHORT =
  "Used only for this session — not saved or shared in analytics.";

/** Shape-only query fingerprint for logs/metrics — never raw text or coords. */
export type SearchQueryShape = {
  hasText: boolean;
  categories: number;
  hasArea: boolean;
  hasBounds: boolean;
  hasRadius: boolean;
  hasStay: boolean;
  hasVerifiedTotal: boolean;
  hasAvailable: boolean;
  amenityCount: number;
  attributeCount: number;
  hasOrigin: boolean;
  hasRouteLimits: boolean;
  sort: SearchQuery["sort"];
  limit: number;
};

export function searchQueryShape(query: SearchQuery): SearchQueryShape {
  return {
    hasText: Boolean(query.text),
    categories: query.categories?.length ?? 0,
    hasArea: Boolean(query.area),
    hasBounds: Boolean(query.bounds),
    hasRadius: Boolean(query.radius),
    hasStay: Boolean(query.checkIn && query.checkOut && query.pax),
    hasVerifiedTotal: Boolean(query.verifiedTotal),
    hasAvailable: Boolean(query.available),
    amenityCount: query.amenities?.length ?? 0,
    attributeCount: query.attributes?.length ?? 0,
    hasOrigin: Boolean(query.origin),
    hasRouteLimits: Boolean(
      query.route &&
        (query.route.maxDurationMin !== undefined ||
          query.route.maxFare !== undefined ||
          query.route.maxWalkingM !== undefined ||
          query.route.maxTransfers !== undefined ||
          query.route.modes?.length ||
          query.route.required),
    ),
    sort: query.sort,
    limit: query.limit,
  };
}

const forbiddenLogKeys = new Set([
  "lat",
  "lng",
  "latitude",
  "longitude",
  "origin",
  "bounds",
  "radius",
  "center",
  "west",
  "east",
  "north",
  "south",
  "text",
  "q",
  "query",
  "ip",
  "userId",
  "user_id",
  "email",
  "cookie",
]);

/** Deep-scrub an object before structured logging. */
export function scrubForLog(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value))
    return value.slice(0, 20).map((entry) => scrubForLog(entry, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenLogKeys.has(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = scrubForLog(entry, depth + 1);
  }
  return out;
}

export function assertNoPreciseLocationKeys(payload: unknown): string[] {
  const found: string[] = [];
  walk(payload, "", found);
  return found;
}

function walk(value: unknown, path: string, found: string[]) {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, `${path}[${index}]`, found));
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (forbiddenLogKeys.has(key) && typeof entry === "number") found.push(next);
    else if (
      forbiddenLogKeys.has(key) &&
      key !== "text" &&
      key !== "q" &&
      key !== "query" &&
      typeof entry === "object" &&
      entry !== null
    )
      found.push(next);
    else walk(entry, next, found);
  }
}

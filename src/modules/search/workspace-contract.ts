import type { SearchQuery } from "@/modules/search/contracts";

const categories = new Set([
  "resort",
  "room",
  "restaurant",
  "activity",
  "service",
]);
const sorts = new Set([
  "best_match",
  "rating",
  "verified_total",
  "distance",
  "newest",
]);
const legacySorts: Record<string, SearchQuery["sort"]> = {
  relevance: "best_match",
  rating: "rating",
  "price-asc": "verified_total",
  newest: "newest",
};
const areaAliases: Record<string, string> = {
  samal: "Samal",
  "davao-city": "Davao City",
};
const rateTypes = new Set([
  "overnight",
  "day_use",
  "entrance",
  "package",
  "hourly",
]);
const cancellationPolicies = new Set(["flexible", "moderate", "strict"]);
const attributeKeys = new Set([
  "day_use",
  "overnight",
  "beach_access",
  "cuisine",
  "duration_hours",
]);

export type WorkspaceSearchParams = Record<
  string,
  string | string[] | undefined
>;

/**
 * Converts the stable public /search URL (including legacy parameters) into
 * the Phase 5 POST contract. Coordinates are purposefully absent: a browser
 * may add the current location to a request in memory, but it is never URL
 * state. Route limits also stay out of the public URL because they require a
 * session origin that is never shareable coordinate state.
 */
export function searchQueryFromWorkspaceParams(
  params: WorkspaceSearchParams,
): SearchQuery {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const all = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };
  const text = first("q")?.trim();
  const category = first("category");
  const area = first("area");
  const location = first("location")?.trim();
  const checkIn = date(first("checkIn"));
  const checkOut = date(first("checkOut"));
  const pax = positiveInt(first("pax"), 100);
  const rooms = positiveInt(first("requestedUnits") ?? first("rooms"), 20);
  const totalMin = money(first("minTotal") ?? first("minPrice"));
  const totalMax = money(first("maxTotal") ?? first("maxPrice"));
  const hasCompleteStay = Boolean(checkIn && checkOut && pax);
  const rawSort = first("sort");
  const sort =
    rawSort && sorts.has(rawSort)
      ? (rawSort as SearchQuery["sort"])
      : rawSort && legacySorts[rawSort]
        ? legacySorts[rawSort]
        : "best_match";
  const query: SearchQuery = { limit: 20, sort };

  if (text) query.text = text.slice(0, 120);
  if (category && categories.has(category))
    query.categories = [
      category as NonNullable<SearchQuery["categories"]>[number],
    ];
  if (location) query.area = location.slice(0, 120);
  else if (area) query.area = areaAliases[area] ?? area.slice(0, 120);
  if (hasCompleteStay) {
    query.checkIn = checkIn;
    query.checkOut = checkOut;
    query.pax = pax;
    if (rooms) query.rooms = rooms;
    if (totalMin !== undefined || totalMax !== undefined) {
      query.verifiedTotal = {
        ...(totalMin !== undefined ? { min: totalMin } : {}),
        ...(totalMax !== undefined ? { max: totalMax } : {}),
      };
    }
    if (first("available") === "1") query.available = true;
  }
  const amenities = all("amenity").filter(Boolean).slice(0, 20);
  if (amenities.length) query.amenities = amenities;
  const selectedRateTypes = all("rateType")
    .filter((value): value is NonNullable<SearchQuery["rateTypes"]>[number] =>
      Boolean(value && rateTypes.has(value)),
    )
    .slice(0, 5);
  if (selectedRateTypes.length) query.rateTypes = selectedRateTypes;
  const selectedCancellations = all("cancellation")
    .filter(
      (
        value,
      ): value is NonNullable<SearchQuery["cancellationPolicies"]>[number] =>
        Boolean(value && cancellationPolicies.has(value)),
    )
    .slice(0, 3);
  if (selectedCancellations.length)
    query.cancellationPolicies = selectedCancellations;
  const attributes = parseAttributes(all("attr"));
  if (attributes.length) query.attributes = attributes;
  const visitAt = parseVisitAt(first("visitDate"), first("visitTime"));
  if (visitAt) query.visitAt = visitAt;
  const rating = boundedNumber(first("rating"), 0, 5);
  if (rating !== undefined) query.ratingMin = rating;
  const bookingMode = first("bookingMode");
  if (bookingMode && ["inquiry", "instant", "none"].includes(bookingMode))
    query.bookingModes = [bookingMode as "inquiry" | "instant" | "none"];
  const crowd = first("crowd");
  if (crowd && ["quiet", "moderate", "busy", "full"].includes(crowd))
    query.crowdLevels = [crowd as "quiet" | "moderate" | "busy" | "full"];
  if (first("dot") === "1") query.dotAccredited = true;
  return query;
}

/**
 * Serializes shareable filter state. Never emits coordinates, bounds, origin,
 * or route ceilings (those require a private session origin).
 */
export function workspaceUpdatesFromQuery(
  query: SearchQuery,
): Record<string, string | string[] | undefined> {
  const hasTrip = Boolean(query.checkIn && query.checkOut && query.pax);
  const visit = splitVisitAt(query.visitAt);
  return {
    q: query.text,
    category: query.categories?.[0],
    area: query.area,
    location: undefined,
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    pax: query.pax ? String(query.pax) : undefined,
    rooms: query.rooms ? String(query.rooms) : undefined,
    requestedUnits: query.rooms ? String(query.rooms) : undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minTotal:
      hasTrip && query.verifiedTotal?.min !== undefined
        ? String(query.verifiedTotal.min / 100)
        : undefined,
    maxTotal:
      hasTrip && query.verifiedTotal?.max !== undefined
        ? String(query.verifiedTotal.max / 100)
        : undefined,
    available: hasTrip && query.available ? "1" : undefined,
    amenity: query.amenities ?? [],
    rateType: query.rateTypes ?? [],
    cancellation: query.cancellationPolicies ?? [],
    attr: (query.attributes ?? []).map(encodeAttribute),
    visitDate: visit?.date,
    visitTime: visit?.time,
    rating: query.ratingMin !== undefined ? String(query.ratingMin) : undefined,
    bookingMode: query.bookingModes?.[0],
    crowd: query.crowdLevels?.[0],
    dot: query.dotAccredited ? "1" : undefined,
    sort: query.sort === "best_match" ? undefined : query.sort,
  };
}

export function paramsFromSearchParams(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries()) as WorkspaceSearchParams;
}

/** Never accepts or emits bounds, coordinates, or location-permission state. */
export function workspaceUrl(
  current: URLSearchParams,
  updates: Record<string, string | string[] | undefined>,
) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    next.delete(key);
    if (Array.isArray(value)) value.forEach((item) => next.append(key, item));
    else if (value) next.set(key, value);
  }
  [
    "lat",
    "lng",
    "bounds",
    "origin",
    "radius",
    "locationPermission",
    "maxDurationMin",
    "maxFare",
    "maxWalkingM",
    "maxTransfers",
    "routeMode",
    "routeRequired",
  ].forEach((key) => next.delete(key));
  const serialized = next.toString();
  return serialized ? `/search?${serialized}` : "/search";
}

export function isSearchContextComplete(query: SearchQuery) {
  return Boolean(query.checkIn && query.checkOut && query.pax);
}

function parseAttributes(raw: string[]) {
  const attributes: NonNullable<SearchQuery["attributes"]> = [];
  for (const item of raw.slice(0, 10)) {
    const separator = item.indexOf(":");
    if (separator <= 0) continue;
    const key = item.slice(0, separator);
    const value = item.slice(separator + 1);
    if (!attributeKeys.has(key) || !value) continue;
    if (key === "duration_hours") {
      const hours = Number(value);
      if (!Number.isFinite(hours) || hours < 0 || hours > 1_000) continue;
      attributes.push({ key: "duration_hours", value: hours });
      continue;
    }
    if (key === "day_use" || key === "overnight" || key === "beach_access") {
      if (value !== "true" && value !== "false") continue;
      attributes.push({
        key,
        value: value === "true",
      });
      continue;
    }
    attributes.push({
      key: key as "cuisine",
      value: value.slice(0, 80),
    });
  }
  return attributes;
}

function encodeAttribute(
  attribute: NonNullable<SearchQuery["attributes"]>[number],
) {
  return `${attribute.key}:${String(attribute.value)}`;
}

function parseVisitAt(dateValue: string | undefined, timeValue: string | undefined) {
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return undefined;
  const time =
    timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : "12:00";
  return `${dateValue}T${time}:00+08:00`;
}

function splitVisitAt(visitAt: string | undefined) {
  if (!visitAt) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(visitAt);
  if (!match) return null;
  return { date: match[1], time: match[2] };
}

function date(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
function positiveInt(value: string | undefined, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : undefined;
}
function boundedNumber(value: string | undefined, min: number, max: number) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
}
function money(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100_000
    ? Math.round(parsed * 100)
    : undefined;
}

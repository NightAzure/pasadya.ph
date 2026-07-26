import { createHash } from "node:crypto";

import { z } from "zod";

const categories = [
  "resort",
  "room",
  "restaurant",
  "activity",
  "service",
] as const;
const bookingModes = ["inquiry", "instant", "none"] as const;
const cancellationPolicies = ["flexible", "moderate", "strict"] as const;
const crowdLevels = ["quiet", "moderate", "busy", "full"] as const;
const ratePlanTypes = [
  "overnight",
  "day_use",
  "entrance",
  "package",
  "hourly",
] as const;
const trustStatuses = [
  "verified",
  "team_verified",
  "owner_provided",
  "estimated",
  "stale",
  "unknown",
] as const;
const transportModes = [
  "jeepney",
  "bus",
  "ferry",
  "tricycle",
  "multicab",
  "habal_habal",
] as const;

const pointSchema = z
  .object({
    lat: z.coerce.number().finite().min(-90).max(90),
    lng: z.coerce.number().finite().min(-180).max(180),
  })
  .strict();
const boundsSchema = z
  .object({
    west: z.coerce.number().finite().min(-180).max(180),
    south: z.coerce.number().finite().min(-90).max(90),
    east: z.coerce.number().finite().min(-180).max(180),
    north: z.coerce.number().finite().min(-90).max(90),
  })
  .strict()
  .superRefine((bounds, context) => {
    if (bounds.west >= bounds.east)
      context.addIssue({
        code: "custom",
        message: "Bounds west must be before east.",
      });
    if (bounds.south >= bounds.north)
      context.addIssue({
        code: "custom",
        message: "Bounds south must be before north.",
      });
    if (bounds.east - bounds.west > 3 || bounds.north - bounds.south > 3)
      context.addIssue({
        code: "custom",
        message: "Bounds are larger than the supported search area.",
      });
  });

const attributeSchema = z
  .object({
    key: z.enum([
      "day_use",
      "overnight",
      "beach_access",
      "cuisine",
      "duration_hours",
    ]),
    value: z.union([
      z.boolean(),
      z.string().trim().min(1).max(80),
      z.coerce.number().finite().min(0).max(1_000),
    ]),
  })
  .strict();

export const searchQuerySchema = z
  .object({
    text: z.string().trim().min(1).max(120).optional(),
    categories: z.array(z.enum(categories)).max(categories.length).optional(),
    area: z.string().trim().min(1).max(120).optional(),
    bounds: boundsSchema.optional(),
    radius: z
      .object({
        center: pointSchema,
        meters: z.coerce.number().int().min(50).max(50_000),
      })
      .optional(),
    checkIn: z.string().date().optional(),
    checkOut: z.string().date().optional(),
    visitAt: z.string().datetime({ offset: true }).optional(),
    pax: z.coerce.number().int().min(1).max(100).optional(),
    rooms: z.coerce.number().int().min(1).max(20).optional(),
    verifiedTotal: z
      .object({
        min: z.coerce.number().int().min(0).max(10_000_000).optional(),
        max: z.coerce.number().int().min(0).max(10_000_000).optional(),
      })
      .strict()
      .optional(),
    rateTypes: z
      .array(z.enum(ratePlanTypes))
      .max(ratePlanTypes.length)
      .optional(),
    amenities: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    attributes: z.array(attributeSchema).max(10).optional(),
    ratingMin: z.coerce.number().min(0).max(5).optional(),
    bookingModes: z
      .array(z.enum(bookingModes))
      .max(bookingModes.length)
      .optional(),
    cancellationPolicies: z
      .array(z.enum(cancellationPolicies))
      .max(cancellationPolicies.length)
      .optional(),
    crowdLevels: z
      .array(z.enum(crowdLevels))
      .max(crowdLevels.length)
      .optional(),
    dotAccredited: z.coerce.boolean().optional(),
    locationTrust: z
      .array(z.enum(trustStatuses))
      .max(trustStatuses.length)
      .optional(),
    available: z.coerce.boolean().optional(),
    origin: pointSchema.optional(),
    route: z
      .object({
        maxDurationMin: z.coerce.number().int().min(1).max(1_440).optional(),
        maxFare: z.coerce.number().int().min(0).max(1_000_000).optional(),
        maxWalkingM: z.coerce.number().int().min(0).max(100_000).optional(),
        maxTransfers: z.coerce.number().int().min(0).max(10).optional(),
        modes: z
          .array(z.enum(transportModes))
          .min(1)
          .max(transportModes.length)
          .optional(),
        /** When true, listings without a modeled route summary are excluded. */
        required: z.coerce.boolean().optional(),
      })
      .strict()
      .optional(),
    sort: z
      .enum(["best_match", "rating", "verified_total", "distance", "newest"])
      .default("best_match"),
    cursor: z.string().min(1).max(1_000).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .superRefine((query, context) => {
    if (query.bounds && query.radius)
      context.addIssue({
        code: "custom",
        message: "Use bounds or radius, not both.",
      });
    if (query.checkIn || query.checkOut) {
      if (!query.checkIn || !query.checkOut)
        context.addIssue({
          code: "custom",
          message: "Check-in and check-out must be supplied together.",
        });
      else {
        const days =
          (Date.parse(`${query.checkOut}T00:00:00Z`) -
            Date.parse(`${query.checkIn}T00:00:00Z`)) /
          86_400_000;
        if (days < 0 || days > 31)
          context.addIssue({
            code: "custom",
            message: "Search dates must cover 0 to 31 days.",
          });
      }
    }
    const requiresQuote = Boolean(
      query.verifiedTotal || query.available || query.pax || query.rooms,
    );
    if (requiresQuote && (!query.checkIn || !query.checkOut || !query.pax))
      context.addIssue({
        code: "custom",
        message:
          "Verified price, availability, capacity, rooms, and guests require dates and party size.",
      });
    if (
      query.verifiedTotal?.min !== undefined &&
      query.verifiedTotal.max !== undefined &&
      query.verifiedTotal.min > query.verifiedTotal.max
    )
      context.addIssue({
        code: "custom",
        message: "Verified total minimum cannot exceed maximum.",
      });
    if (query.route && !query.origin)
      context.addIssue({
        code: "custom",
        message: "Route limits require a named or selected origin.",
      });
  });

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export type SearchCursor = {
  v: 1;
  fingerprint: string;
  key: [number, string, string];
};

export function queryFingerprint(query: SearchQuery) {
  const shape = Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => key !== "cursor" && key !== "limit")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  return createHash("sha256")
    .update(JSON.stringify(shape))
    .digest("base64url")
    .slice(0, 20);
}

export function decodeCursor(
  value: string,
  expectedFingerprint: string,
): SearchCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid search cursor.");
  }
  const cursor = z
    .object({
      v: z.literal(1),
      fingerprint: z.string().min(1),
      key: z.tuple([z.number().finite(), z.string(), z.string()]),
    })
    .safeParse(parsed);
  if (!cursor.success || cursor.data.fingerprint !== expectedFingerprint)
    throw new Error("Search cursor does not match this query.");
  return cursor.data;
}

export function encodeCursor(cursor: SearchCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export type SearchSuggestion = {
  kind: "listing" | "area" | "stop" | "category";
  label: string;
  value: string;
  detail?: string;
};

export type SearchRouteSummary = {
  durationMin: number;
  fareMin: number;
  fareMax: number;
  walkingM: number;
  transfers: number;
  modes: Array<(typeof transportModes)[number] | "walk">;
  firstMile: string;
  lastMile: string;
  confidence: "high" | "medium" | "low";
  lastVerifiedAt: string | null;
  modeled: boolean;
  source: "official" | "community" | "seeded" | "mixed";
};

export type SearchResponse = {
  listings: Array<{
    id: string;
    slug: string;
    name: string;
    category: (typeof categories)[number];
    area: string | null;
    image: { url: string; alt: string } | null;
    /** Public listing coordinates, never a visitor's current location. */
    coordinates: { lat: number; lng: number } | null;
    bookingMode: (typeof bookingModes)[number];
    startingPrice: {
      amount: number;
      currency: "PHP";
      rateName: string;
      basis: string;
      trust: (typeof trustStatuses)[number];
    } | null;
    rating: { average: number; count: number; confidence: number };
    distanceM: number | null;
    matchedRate: {
      id: string;
      name: string;
      total: number;
      currency: "PHP";
    } | null;
    availability: Array<{
      date: string;
      capacity: number;
      reserved: number;
      available: boolean;
    }>;
    route: SearchRouteSummary | null;
    matchReasons: string[];
    dataWarnings: string[];
  }>;
  facets: {
    categories: Array<{ value: string; count: number }>;
    amenities: Array<{ value: string; count: number }>;
    rateTypes: Array<{ value: string; count: number }>;
    bookingModes: Array<{ value: string; count: number }>;
    cuisines: Array<{ value: string; count: number }>;
    cancellationPolicies: Array<{ value: string; count: number }>;
    verifiedTotal: Array<{ min: number; max: number; count: number }>;
  };
  totalCount: number;
  resultBounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  } | null;
  nextCursor: string | null;
  diagnostics: {
    exact: true;
    failedConstraints: string[];
    candidateCount: number;
    /** True when the SQL candidate cap truncated the pre-evaluation set. */
    candidateCapReached?: boolean;
  };
  timing: {
    durationMs: number;
    candidateMs: number;
    quoteMs: number;
    cache: "hit" | "miss" | "bypass" | "none";
  };
};

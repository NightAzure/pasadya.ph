import { sql, type SQL } from "drizzle-orm";

import { db } from "@/db/client";

export const categoryLabels = {
  resort: "Resorts",
  room: "Rooms & stays",
  restaurant: "Restaurants & cafes",
  activity: "Activities",
  service: "Services",
} as const;

export const categoryPathSegments = {
  resorts: "resort",
  rooms: "room",
  restaurants: "restaurant",
  activities: "activity",
  services: "service",
} as const;

export const areaOptions = {
  samal: {
    label: "Samal Island",
    municipality: "Samal",
    description:
      "Beach resorts, day-use spots, cottages, and island activities.",
  },
  "davao-city": {
    label: "Davao City",
    municipality: "Davao City",
    description:
      "City stays, food stops, airport access, and weekend jump-off points.",
  },
} as const;

export const amenityOptions = [
  { slug: "pool", label: "Pool" },
  { slug: "beach-access", label: "Beach access" },
  { slug: "wifi", label: "WiFi" },
  { slug: "aircon", label: "Aircon" },
  { slug: "parking", label: "Parking" },
  { slug: "snorkeling", label: "Snorkeling" },
] as const;

export type ListingCategory = keyof typeof categoryLabels;
export type AreaSlug = keyof typeof areaOptions;
export type CategoryPathSegment = keyof typeof categoryPathSegments;

export type ListingMedia = {
  url: string;
  caption: string | null;
  sortOrder: number;
};

export type ListingAmenity = {
  slug: string;
  name: string;
  icon: string;
};

export type RatePlan = {
  id: string;
  name: string;
  type: string;
  price: number;
  priceUnit: string;
  billingPeriod: string | null;
  description: string | null;
};

export type ListingAddress = {
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  postal_code?: string;
};

export type ListingAttributes = {
  day_use?: boolean;
  overnight?: boolean;
  beach_access?: boolean;
  room_count?: number;
  cuisine?: string[];
  duration_hours?: number;
  max_pax?: number;
  crowd_level?: "quiet" | "moderate" | "busy" | "full";
  crowd_source?: string;
  price_range?: string;
  [key: string]: unknown;
};

export type DiscoveryListing = {
  id: string;
  slug: string;
  name: string;
  category: ListingCategory;
  description: string;
  claimStatus: "unclaimed" | "pending" | "claimed" | "disputed";
  address: ListingAddress;
  attributes: ListingAttributes;
  priceMin: number | null;
  priceMax: number | null;
  ratingAvg: number;
  ratingCount: number;
  dotAccredited: boolean;
  bookingMode: "inquiry" | "instant" | "none";
  cancellationPolicy: "flexible" | "moderate" | "strict";
  downpaymentPct: number;
  lat: number | null;
  lng: number | null;
  media: ListingMedia[];
  amenities: ListingAmenity[];
  ratePlans: RatePlan[];
};

export type DiscoveryCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  listingIds: string[];
};

export type SearchFilters = {
  q?: string;
  category?: ListingCategory;
  area?: AreaSlug;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  checkIn?: string;
  checkOut?: string;
  pax?: number;
  requestedUnits?: number;
  durationHours?: number;
  amenities?: string[];
  minRating?: number;
  bookingMode?: "inquiry" | "instant" | "none";
  crowd?: "quiet" | "moderate" | "busy" | "full";
  dotAccredited?: boolean;
  sort?: "relevance" | "rating" | "price-asc" | "newest";
  listingIds?: string[];
  limit?: number;
};

type SearchRow = Omit<
  DiscoveryListing,
  "ratingAvg" | "media" | "amenities" | "ratePlans"
> & {
  ratingAvg: string | number;
  media: unknown;
  amenities: unknown;
  ratePlans: unknown;
};

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  listingIds: string[] | null;
};

const categoryValues = Object.keys(categoryLabels) as ListingCategory[];
const areaValues = Object.keys(areaOptions) as AreaSlug[];

export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaults: Partial<SearchFilters> = {},
): SearchFilters {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const all = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value : value ? [value] : [];

  const category = first(searchParams.category);
  const area = first(searchParams.area);
  const minPrice = Number(first(searchParams.minPrice));
  const maxPrice = Number(first(searchParams.maxPrice));
  const minRating = Number(first(searchParams.rating));
  const bookingMode = first(searchParams.bookingMode);
  const crowd = first(searchParams.crowd);
  const sort = first(searchParams.sort);
  const checkIn = validIsoDate(first(searchParams.checkIn));
  const checkOut = validIsoDate(first(searchParams.checkOut));
  const pax = positiveInteger(first(searchParams.pax));
  const requestedUnits = positiveInteger(first(searchParams.requestedUnits));
  const durationHours = positiveInteger(first(searchParams.durationHours));

  return {
    ...defaults,
    q: first(searchParams.q)?.trim() || defaults.q,
    category: isCategory(category) ? category : defaults.category,
    area: isArea(area) ? area : defaults.area,
    location: first(searchParams.location)?.trim() || defaults.location,
    minPrice: Number.isFinite(minPrice) ? minPrice * 100 : defaults.minPrice,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice * 100 : defaults.maxPrice,
    checkIn: checkIn ?? defaults.checkIn,
    checkOut: checkOut ?? defaults.checkOut,
    pax: pax ?? defaults.pax,
    requestedUnits: requestedUnits ?? defaults.requestedUnits,
    durationHours: durationHours ?? defaults.durationHours,
    amenities: all(searchParams.amenity).filter(Boolean),
    minRating: Number.isFinite(minRating) ? minRating : defaults.minRating,
    bookingMode: isBookingMode(bookingMode)
      ? bookingMode
      : defaults.bookingMode,
    crowd: isCrowdLevel(crowd) ? crowd : defaults.crowd,
    dotAccredited:
      first(searchParams.dot) === "1" ? true : defaults.dotAccredited,
    sort: isSort(sort) ? sort : defaults.sort,
  };
}

export function categoryFromPathSegment(
  segment: string | undefined,
): ListingCategory | undefined {
  if (!segment) {
    return undefined;
  }

  return categoryPathSegments[segment as CategoryPathSegment];
}

export function isArea(value: string | undefined): value is AreaSlug {
  return Boolean(value && areaValues.includes(value as AreaSlug));
}

export function isCategory(
  value: string | undefined,
): value is ListingCategory {
  return Boolean(value && categoryValues.includes(value as ListingCategory));
}

export function formatAddress(address: ListingAddress) {
  return [address.barangay, address.municipality, address.province]
    .filter(Boolean)
    .join(", ");
}

export function formatPrice(price: number | null, unit = "") {
  if (!price) {
    return "Ask for rates";
  }

  return `PHP ${(price / 100).toLocaleString("en-PH")}${unit}`;
}

export function crowdLabel(attributes: ListingAttributes) {
  const level = attributes.crowd_level ?? "moderate";
  const source = attributes.crowd_source ?? "typical local patterns";

  return {
    level,
    source,
    label: level.charAt(0).toUpperCase() + level.slice(1),
  };
}

export async function searchListings(filters: SearchFilters = {}) {
  const conditions = buildConditions(filters);
  const orderBy = buildOrderBy(filters);
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 50);

  const query = sql<SearchRow>`
    select
      l.id::text as "id",
      l.slug as "slug",
      l.name as "name",
      l.category as "category",
      coalesce(l.description, '') as "description",
      l.claim_status as "claimStatus",
      l.address as "address",
      case
        when active_crowd.level is not null then
          jsonb_set(
            jsonb_set(l.attributes, '{crowd_level}', to_jsonb(active_crowd.level::text), true),
            '{crowd_source}',
            to_jsonb(active_crowd.source_label),
            true
          )
        when l.attributes ->> 'crowd_source' ilike '%business%' then
          l.attributes - 'crowd_level' - 'crowd_source'
        else l.attributes
      end as "attributes",
      l.price_min as "priceMin",
      l.price_max as "priceMax",
      l.rating_avg as "ratingAvg",
      l.rating_count as "ratingCount",
      l.dot_accredited as "dotAccredited",
      l.booking_mode as "bookingMode",
      l.cancellation_policy as "cancellationPolicy",
      l.downpayment_pct as "downpaymentPct",
      case when l.location is null then null else ST_Y(l.location::geometry) end as "lat",
      case when l.location is null then null else ST_X(l.location::geometry) end as "lng",
      coalesce(media.items, '[]'::json) as "media",
      coalesce(amenity.items, '[]'::json) as "amenities",
      coalesce(rate.items, '[]'::json) as "ratePlans"
    from listings l
    left join lateral (
      select level, source_label
      from (
        select cr.level, 'Reported by the business; expires in 12 hours'::text as source_label,
          0 as priority, cr.created_at, 1::bigint as report_count
        from crowd_reports cr
        where cr.listing_id = l.id and cr.source = 'business'::crowd_source and cr.expires_at > now()
        union all
        select cr.level, 'Community check-ins (3+ reports in 4 hours)'::text as source_label,
          1 as priority, max(cr.created_at), count(*)
        from crowd_reports cr
        where cr.listing_id = l.id and cr.source = 'community'::crowd_source
          and cr.created_at >= now() - interval '4 hours'
        group by cr.level
        having count(*) >= 3
      ) signals
      order by priority, report_count desc, created_at desc
      limit 1
    ) active_crowd on true
    left join lateral (
      select json_agg(
        json_build_object(
          'url', lm.url,
          'caption', lm.caption,
          'sortOrder', lm.sort_order
        )
        order by lm.sort_order asc
      ) as items
      from listing_media lm
      where lm.listing_id = l.id and lm.type = 'photo'
    ) media on true
    left join lateral (
      select json_agg(
        json_build_object(
          'slug', a.slug,
          'name', a.name,
          'icon', a.icon
        )
        order by a.name asc
      ) as items
      from listing_amenities la
      join amenities a on a.id = la.amenity_id
      where la.listing_id = l.id
    ) amenity on true
    left join lateral (
      select json_agg(
        json_build_object(
          'id', rp.id::text,
          'name', rp.name,
          'type', rp.type,
          'price', rp.price,
          'priceUnit', rp.price_unit,
          'billingPeriod', rp.billing_period,
          'description', rp.description
        )
        order by rp.sort_order asc
      ) as items
      from rate_plans rp
      where rp.listing_id = l.id and rp.active = true
    ) rate on true
    where ${sql.join(conditions, sql` and `)}
    ${orderBy}
    limit ${limit}
  `;

  const result = await db.execute<SearchRow>(query);
  return result.rows.map(mapListingRow);
}

export async function getListingBySlug(slug: string) {
  const listingIds = await getListingIdsBySlug(slug);
  if (listingIds.length === 0) {
    return null;
  }

  const listings = await searchListings({
    limit: 1,
    listingIds,
  });

  return listings[0] ?? null;
}

export async function getFeaturedListings() {
  return searchListings({ limit: 6, sort: "rating" });
}

export async function getCollections() {
  const result = await db.execute<CollectionRow>(sql`
    select
      id::text as "id",
      slug,
      title,
      description,
      cover_image as "coverImage",
      listing_ids::text[] as "listingIds"
    from collections
    where published = true
    order by created_at asc
  `);

  return result.rows.map(mapCollectionRow);
}

export async function getCollectionBySlug(slug: string) {
  const result = await db.execute<CollectionRow>(sql`
    select
      id::text as "id",
      slug,
      title,
      description,
      cover_image as "coverImage",
      listing_ids::text[] as "listingIds"
    from collections
    where published = true and slug = ${slug}
    limit 1
  `);

  const collection = result.rows[0];
  return collection ? mapCollectionRow(collection) : null;
}

export async function getListingsForCollection(
  collection: DiscoveryCollection,
) {
  if (collection.listingIds.length === 0) {
    return [];
  }

  const listings = await searchListings({
    listingIds: collection.listingIds,
    limit: collection.listingIds.length,
  });

  return collection.listingIds
    .map((id) => listings.find((listing) => listing.id === id))
    .filter((listing): listing is DiscoveryListing => Boolean(listing));
}

export async function getNearbyListings(listing: DiscoveryListing) {
  const area = areaFromAddress(listing.address);
  const nearby = await searchListings({
    area,
    category: listing.category,
    limit: 4,
    sort: "rating",
  });

  return nearby.filter((nearbyListing) => nearbyListing.id !== listing.id);
}

function buildConditions(filters: SearchFilters) {
  const conditions: SQL[] = [sql`l.status = 'published'`];

  if (filters.q) {
    const likeQuery = `%${filters.q}%`;
    conditions.push(sql`(
      l.search_vector @@ plainto_tsquery('english', ${filters.q})
      or similarity(l.name, ${filters.q}) > 0.15
      or l.name ilike ${likeQuery}
      or coalesce(l.description, '') ilike ${likeQuery}
    )`);
  }

  if (filters.category) {
    conditions.push(sql`l.category = ${filters.category}::listing_category`);
  }

  if (filters.area) {
    conditions.push(
      sql`l.address ->> 'municipality' ilike ${areaOptions[filters.area].municipality}`,
    );
  }

  if (filters.location) {
    const likeLocation = `%${filters.location}%`;
    conditions.push(sql`(
      l.address ->> 'barangay' ilike ${likeLocation}
      or l.address ->> 'municipality' ilike ${likeLocation}
      or l.address ->> 'province' ilike ${likeLocation}
    )`);
  }

  if (filters.minPrice) {
    conditions.push(sql`l.price_min >= ${filters.minPrice}`);
  }

  if (filters.maxPrice) {
    conditions.push(sql`l.price_min <= ${filters.maxPrice}`);
  }

  if (filters.minRating) {
    conditions.push(sql`l.rating_avg >= ${filters.minRating}`);
  }

  if (filters.bookingMode) {
    conditions.push(sql`l.booking_mode = ${filters.bookingMode}::booking_mode`);
  }

  if (filters.crowd) {
    conditions.push(sql`coalesce(
      (
        select cr.level::text
        from crowd_reports cr
        where cr.listing_id = l.id
          and cr.source = 'business'
          and cr.expires_at > now()
        order by cr.created_at desc
        limit 1
      ),
      case
        when l.attributes ->> 'crowd_source' ilike '%business%' then null
        else l.attributes ->> 'crowd_level'
      end
    ) = ${filters.crowd}`);
  }

  if (filters.dotAccredited) {
    conditions.push(sql`l.dot_accredited = true`);
  }

  for (const amenity of filters.amenities ?? []) {
    conditions.push(sql`exists (
      select 1
      from listing_amenities la
      join amenities a on a.id = la.amenity_id
      where la.listing_id = l.id and a.slug = ${amenity}
    )`);
  }

  if (filters.listingIds && filters.listingIds.length > 0) {
    conditions.push(
      sql`l.id::text in (${sql.join(
        filters.listingIds.map((listingId) => sql`${listingId}`),
        sql`, `,
      )})`,
    );
  }

  return conditions;
}

function buildOrderBy(filters: SearchFilters) {
  switch (filters.sort) {
    case "price-asc":
      return sql`order by l.price_min asc nulls last, l.rating_avg desc`;
    case "newest":
      return sql`order by l.published_at desc nulls last, l.rating_avg desc`;
    case "rating":
      return sql`order by l.rating_avg desc, l.rating_count desc`;
    case "relevance":
    default:
      if (filters.q) {
        return sql`order by ts_rank_cd(l.search_vector, plainto_tsquery('english', ${filters.q})) desc, l.rating_avg desc`;
      }

      return sql`order by l.rating_avg desc, l.rating_count desc`;
  }
}

async function getListingIdsBySlug(slug: string) {
  const result = await db.execute<{ id: string }>(sql`
    select id::text as id
    from listings
    where slug = ${slug}
    limit 1
  `);

  return result.rows.map((row) => row.id);
}

function mapListingRow(row: SearchRow): DiscoveryListing {
  return {
    ...row,
    category: row.category,
    description: row.description ?? "",
    ratingAvg: Number(row.ratingAvg),
    media: asArray<ListingMedia>(row.media),
    amenities: asArray<ListingAmenity>(row.amenities),
    ratePlans: asArray<RatePlan>(row.ratePlans),
  };
}

function mapCollectionRow(row: CollectionRow): DiscoveryCollection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    coverImage: row.coverImage,
    listingIds: row.listingIds ?? [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function areaFromAddress(address: ListingAddress) {
  if (address.municipality === "Davao City") {
    return "davao-city";
  }

  return "samal";
}

function isBookingMode(
  value: string | undefined,
): value is SearchFilters["bookingMode"] {
  return value === "inquiry" || value === "instant" || value === "none";
}

function isCrowdLevel(
  value: string | undefined,
): value is SearchFilters["crowd"] {
  return (
    value === "quiet" ||
    value === "moderate" ||
    value === "busy" ||
    value === "full"
  );
}

function isSort(value: string | undefined): value is SearchFilters["sort"] {
  return (
    value === "relevance" ||
    value === "rating" ||
    value === "price-asc" ||
    value === "newest"
  );
}

function validIsoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function positiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 999
    ? parsed
    : undefined;
}

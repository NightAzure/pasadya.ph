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

export function categoryFromPathSegment(
  segment: string | undefined,
): ListingCategory | undefined {
  if (!segment) {
    return undefined;
  }

  return categoryPathSegments[segment as CategoryPathSegment];
}

export function isArea(value: string | undefined): value is AreaSlug {
  return Boolean(value && Object.keys(areaOptions).includes(value as AreaSlug));
}

export function isCategory(
  value: string | undefined,
): value is ListingCategory {
  return Boolean(
    value && Object.keys(categoryLabels).includes(value as ListingCategory),
  );
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

import type { SearchQuery } from "@/modules/search/contracts";

export type SearchCategory =
  | "resort"
  | "room"
  | "restaurant"
  | "activity"
  | "service";

export type FilterGroup =
  | "lodging"
  | "dining"
  | "experience"
  | "universal"
  | "mixed";

export type FilterControlId =
  | "dates"
  | "visitAt"
  | "pax"
  | "rooms"
  | "verifiedTotal"
  | "available"
  | "rateTypes"
  | "stayMode"
  | "cuisine"
  | "durationHours"
  | "cancellation"
  | "bookingModes"
  | "amenities"
  | "rating"
  | "crowd"
  | "dot"
  | "route"
  | "area";

export type AmenityOption = { value: string; label: string };

export type FilterProfile = {
  group: FilterGroup;
  label: string;
  explanation: string | null;
  controls: Set<FilterControlId>;
  amenities: AmenityOption[];
  rateTypes: Array<{ value: string; label: string }>;
  priceBasisLabel: string;
};

const lodgingAmenities: AmenityOption[] = [
  { value: "pool", label: "Pool" },
  { value: "beach-access", label: "Beach access" },
  { value: "wifi", label: "WiFi" },
  { value: "aircon", label: "Aircon" },
  { value: "parking", label: "Parking" },
  { value: "kitchen", label: "Kitchen" },
  { value: "pet-friendly", label: "Pet friendly" },
  { value: "kiddie-pool", label: "Kiddie pool" },
];

const diningAmenities: AmenityOption[] = [
  { value: "wifi", label: "WiFi" },
  { value: "parking", label: "Parking" },
  { value: "beach-access", label: "Beach access" },
  { value: "pet-friendly", label: "Pet friendly" },
];

const experienceAmenities: AmenityOption[] = [
  { value: "snorkeling", label: "Snorkeling" },
  { value: "atv", label: "ATV" },
  { value: "bonfire", label: "Bonfire" },
  { value: "parking", label: "Parking" },
  { value: "wifi", label: "WiFi" },
];

const universalAmenities: AmenityOption[] = [
  { value: "wifi", label: "WiFi" },
  { value: "parking", label: "Parking" },
  { value: "beach-access", label: "Beach access" },
  { value: "pool", label: "Pool" },
  { value: "aircon", label: "Aircon" },
  { value: "snorkeling", label: "Snorkeling" },
];

const lodgingRateTypes = [
  { value: "overnight", label: "Overnight" },
  { value: "day_use", label: "Day-use" },
  { value: "package", label: "Package" },
] as const;

const experienceRateTypes = [
  { value: "package", label: "Package / group" },
  { value: "entrance", label: "Per person / entrance" },
  { value: "hourly", label: "Hourly" },
] as const;

const cuisineOptions = [
  { value: "filipino", label: "Filipino" },
  { value: "seafood", label: "Seafood" },
  { value: "barbecue", label: "Barbecue" },
  { value: "coffee", label: "Coffee" },
  { value: "breakfast", label: "Breakfast" },
] as const;

const universalControls: FilterControlId[] = [
  "area",
  "dates",
  "pax",
  "verifiedTotal",
  "route",
  "amenities",
  "rating",
  "bookingModes",
  "crowd",
  "dot",
];

const lodgingControls: FilterControlId[] = [
  ...universalControls,
  "rooms",
  "available",
  "rateTypes",
  "stayMode",
  "cancellation",
];

const diningControls: FilterControlId[] = [
  "area",
  "visitAt",
  "pax",
  "verifiedTotal",
  "route",
  "cuisine",
  "amenities",
  "bookingModes",
  "rating",
  "crowd",
  "dot",
];

const experienceControls: FilterControlId[] = [
  "area",
  "dates",
  "visitAt",
  "pax",
  "verifiedTotal",
  "available",
  "route",
  "rateTypes",
  "durationHours",
  "amenities",
  "bookingModes",
  "rating",
  "crowd",
  "dot",
];

export function categoryGroup(
  categories: SearchCategory[] | undefined,
): FilterGroup {
  if (!categories?.length) return "universal";
  const groups = new Set(
    categories.map((category) => {
      if (category === "resort" || category === "room") return "lodging";
      if (category === "restaurant") return "dining";
      return "experience";
    }),
  );
  if (groups.size > 1) return "mixed";
  return [...groups][0] as FilterGroup;
}

export function getFilterProfile(
  categories: SearchCategory[] | undefined,
): FilterProfile {
  const group = categoryGroup(categories);
  switch (group) {
    case "lodging":
      return {
        group,
        label: "Rooms & resorts",
        explanation: null,
        controls: new Set(lodgingControls),
        amenities: lodgingAmenities,
        rateTypes: [...lodgingRateTypes],
        priceBasisLabel: "Exact verified stay total (PHP)",
      };
    case "dining":
      return {
        group,
        label: "Restaurants",
        explanation: null,
        controls: new Set(diningControls),
        amenities: diningAmenities,
        rateTypes: [],
        priceBasisLabel: "Verified per-person / party total (PHP)",
      };
    case "experience":
      return {
        group,
        label: "Activities & services",
        explanation: null,
        controls: new Set(experienceControls),
        amenities: experienceAmenities,
        rateTypes: [...experienceRateTypes],
        priceBasisLabel: "Exact verified group / package total (PHP)",
      };
    case "mixed":
      return {
        group,
        label: "Mixed categories",
        explanation:
          "Category-specific filters are hidden while incompatible categories are selected. Keep one category to unlock stay, dining, or activity controls.",
        controls: new Set(universalControls),
        amenities: universalAmenities,
        rateTypes: [],
        priceBasisLabel: "Verified total when trip context is complete (PHP)",
      };
    default:
      return {
        group: "universal",
        label: "All places",
        explanation: null,
        controls: new Set([
          ...universalControls,
          "rooms",
          "available",
          "rateTypes",
          "cancellation",
        ]),
        amenities: universalAmenities,
        rateTypes: [
          ...lodgingRateTypes,
          { value: "entrance", label: "Entrance / per person" },
          { value: "hourly", label: "Hourly" },
        ],
        priceBasisLabel: "Verified total when trip context is complete (PHP)",
      };
  }
}

export function cuisineFilterOptions() {
  return [...cuisineOptions];
}

/** Category-specific query keys that may be preserved while the user switches. */
export function categorySpecificQueryKeys(): Array<keyof SearchQuery> {
  return [
    "rateTypes",
    "attributes",
    "visitAt",
    "available",
    "rooms",
    "cancellationPolicies",
  ];
}

export function orphanedCategoryFilters(
  query: SearchQuery,
  profile: FilterProfile,
): string[] {
  const orphans: string[] = [];
  if (
    query.rateTypes?.length &&
    !profile.controls.has("rateTypes") &&
    !profile.controls.has("stayMode")
  )
    orphans.push("Stay or pricing type");
  if (
    query.attributes?.some((attribute) => attribute.key === "cuisine") &&
    !profile.controls.has("cuisine")
  )
    orphans.push("Cuisine");
  if (
    query.attributes?.some((attribute) => attribute.key === "duration_hours") &&
    !profile.controls.has("durationHours")
  )
    orphans.push("Duration");
  if (
    query.attributes?.some(
      (attribute) =>
        attribute.key === "day_use" || attribute.key === "overnight",
    ) &&
    !profile.controls.has("stayMode")
  )
    orphans.push("Overnight / day-use");
  if (query.visitAt && !profile.controls.has("visitAt"))
    orphans.push("Visit time");
  if (query.available && !profile.controls.has("available"))
    orphans.push("Available inventory");
  if (query.rooms && !profile.controls.has("rooms")) orphans.push("Rooms");
  if (
    query.cancellationPolicies?.length &&
    !profile.controls.has("cancellation")
  )
    orphans.push("Cancellation terms");
  return orphans;
}

export function stripOrphanedCategoryFilters(query: SearchQuery): SearchQuery {
  const profile = getFilterProfile(query.categories);
  const next: SearchQuery = { ...query };
  if (!profile.controls.has("rateTypes") && !profile.controls.has("stayMode"))
    delete next.rateTypes;
  if (!profile.controls.has("visitAt")) delete next.visitAt;
  if (!profile.controls.has("available")) delete next.available;
  if (!profile.controls.has("rooms")) delete next.rooms;
  if (!profile.controls.has("cancellation")) delete next.cancellationPolicies;
  if (next.attributes?.length) {
    const kept = next.attributes.filter((attribute) => {
      if (attribute.key === "cuisine") return profile.controls.has("cuisine");
      if (attribute.key === "duration_hours")
        return profile.controls.has("durationHours");
      if (attribute.key === "day_use" || attribute.key === "overnight")
        return profile.controls.has("stayMode");
      return true;
    });
    if (kept.length) next.attributes = kept;
    else delete next.attributes;
  }
  return next;
}

export function unknownDataRule(control: FilterControlId): string {
  switch (control) {
    case "verifiedTotal":
      return "Listings without a fresh verified total for your trip are excluded when a budget is set.";
    case "available":
      return "Only listings with explicit daily availability for every selected date pass.";
    case "visitAt":
      return "Places without structured hours for the selected time are excluded.";
    case "cuisine":
      return "Restaurants without a matching cuisine attribute are excluded.";
    case "durationHours":
      return "Activities without a matching duration attribute are excluded.";
    case "cancellation":
      return "Listings without a matching cancellation policy are excluded.";
    case "rateTypes":
    case "stayMode":
      return "Places without a matching active rate type or stay-mode attribute are excluded.";
    case "route":
      return "Any selected route limit is a hard constraint. Missing route evidence never passes.";
    case "amenities":
      return "Only listings linked to every selected amenity pass.";
    default:
      return "Unknown or incomplete structured data never passes a hard filter.";
  }
}

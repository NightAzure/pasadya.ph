import {
  getCollections,
  getFeaturedListings,
  type DiscoveryCollection,
  type DiscoveryListing,
} from "@/modules/listings/search";
import {
  getFerrySchedules,
  getPublishedRoutes,
  type FerrySchedule,
  type TransportRoute,
} from "@/modules/transport/service";

export type ConceptHomeData = {
  featuredListings: DiscoveryListing[];
  listings: DiscoveryListing[];
  collections: DiscoveryCollection[];
  routes: TransportRoute[];
  ferries: FerrySchedule[];
};

export async function getConceptHomeData(): Promise<ConceptHomeData> {
  const [featuredListings, collections, routes, ferries] = await Promise.all([
    getFeaturedListings(),
    getCollections(),
    getPublishedRoutes(),
    getFerrySchedules(),
  ]);

  const cappedListings = featuredListings.slice(0, 6).map(toPublicListing);

  return {
    featuredListings: cappedListings,
    listings: cappedListings,
    collections: collections.slice(0, 2).map((collection) => ({
      ...collection,
      description: cleanPublicCopy(
        collection.description,
        "A considered guide to Davao City + Samal Island.",
      ),
    })),
    routes: routes.slice(0, 6),
    ferries: ferries.slice(0, 3).map((ferry) => ({
      ...ferry,
      operator: hasInternalCopy(ferry.operator) ? null : ferry.operator,
      notes: ferry.notes
        ? cleanPublicCopy(ferry.notes, "Confirm details with local operators.")
        : null,
    })),
  };
}

function toPublicListing(listing: DiscoveryListing): DiscoveryListing {
  return {
    ...listing,
    description: cleanPublicCopy(
      listing.description,
      `Discover ${listing.name} in Davao City + Samal Island.`,
    ),
    media: listing.media.map((item) => ({
      ...item,
      caption:
        !item.caption || hasInternalCopy(item.caption)
          ? `Photo of ${listing.name}`
          : item.caption,
    })),
  };
}

function hasInternalCopy(value: string | null): boolean {
  return Boolean(
    value &&
    /\b(?:generated placeholder|project z development|seed(?:ed|\s+(?:set|data|corridor))?|phase\s*\d+|map coordinates?|seo)\b/i.test(
      value,
    ),
  );
}

function cleanPublicCopy(value: string, fallback: string): string {
  const cleaned = value
    .replace(/\bproject z development\b/gi, "")
    .replace(/\bseed(?:ed|\s+(?:set|data|corridor))?\b/gi, "")
    .replace(/\bphase\s*\d+\b/gi, "")
    .replace(/\bmap coordinates?\b/gi, "location details")
    .replace(/\bseo\b/gi, "discovery")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallback;
}

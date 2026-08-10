import type { MetadataRoute } from "next";

import {
  areaOptions,
  categoryPathSegments,
  getCollections,
  searchListings,
  type DiscoveryCollection,
  type DiscoveryListing,
} from "@/modules/listings/search";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let listings: DiscoveryListing[] = [];
  let collections: DiscoveryCollection[] = [];

  try {
    [listings, collections] = await Promise.all([
      searchListings({ limit: 50, sort: "newest" }),
      getCollections(),
    ]);
  } catch (error) {
    console.warn(
      "[sitemap] Database unavailable; emitting static routes only.",
      error instanceof Error ? error.message : error,
    );
  }

  const staticRoutes = [
    "",
    "/search",
    "/transport",
    "/legal/privacy",
    "/legal/terms",
    "/legal/transport-disclaimer",
    "/legal/cancellation-policy",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path.startsWith("/legal/") ? 0.5 : 0.7,
  }));

  const areaRoutes = Object.keys(areaOptions).flatMap((area) => [
    {
      url: `${baseUrl}/${area}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...Object.keys(categoryPathSegments).map((category) => ({
      url: `${baseUrl}/${area}/${category}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]);

  const listingRoutes = listings.map((listing) => ({
    url: `${baseUrl}/place/${listing.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const collectionRoutes = collections.map((collection) => ({
    url: `${baseUrl}/collections/${collection.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [
    ...staticRoutes,
    ...areaRoutes,
    ...listingRoutes,
    ...collectionRoutes,
  ];
}

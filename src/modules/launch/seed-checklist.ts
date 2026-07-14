import { sql } from "drizzle-orm";

import { db } from "@/db/client";

export type LaunchSeedCounts = {
  publishedListings: number;
  activeRatePlans: number;
  moderatedListingMedia: number;
  amenities: number;
  publishedCollections: number;
  publishedTransportRoutes: number;
  routeStops: number;
  routeSegments: number;
  ferrySchedules: number;
};

export type LaunchChecklistItem = {
  key: keyof LaunchSeedCounts;
  label: string;
  minimum: number;
  actual: number;
  ready: boolean;
};

export type LaunchSeedChecklist = {
  ready: boolean;
  checkedAt: Date;
  counts: LaunchSeedCounts;
  items: LaunchChecklistItem[];
};

const requirements: Array<
  Pick<LaunchChecklistItem, "key" | "label" | "minimum">
> = [
  { key: "publishedListings", label: "Published listings", minimum: 1 },
  { key: "activeRatePlans", label: "Active rate plans", minimum: 1 },
  {
    key: "moderatedListingMedia",
    label: "Moderated listing media",
    minimum: 1,
  },
  { key: "amenities", label: "Amenities", minimum: 1 },
  {
    key: "publishedCollections",
    label: "Published collections",
    minimum: 1,
  },
  {
    key: "publishedTransportRoutes",
    label: "Published transport routes",
    minimum: 1,
  },
  { key: "routeStops", label: "Route stops", minimum: 2 },
  { key: "routeSegments", label: "Route segments", minimum: 1 },
  { key: "ferrySchedules", label: "Ferry schedules", minimum: 1 },
];

export async function getLaunchSeedChecklist(): Promise<LaunchSeedChecklist> {
  const result = await db.execute<LaunchSeedCounts>(sql`
    select
      (select count(*)::integer from listings where status = 'published') as "publishedListings",
      (select count(*)::integer from rate_plans where active = true) as "activeRatePlans",
      (select count(*)::integer from listing_media where moderated = true) as "moderatedListingMedia",
      (select count(*)::integer from amenities) as "amenities",
      (select count(*)::integer from collections where published = true) as "publishedCollections",
      (select count(*)::integer from transport_routes where status = 'published') as "publishedTransportRoutes",
      (select count(*)::integer from route_stops) as "routeStops",
      (select count(*)::integer from route_segments) as "routeSegments",
      (select count(*)::integer from ferry_schedules) as "ferrySchedules"
  `);

  const row = result.rows[0];
  if (!row) {
    throw new Error("Launch seed checklist could not read database counts.");
  }

  const counts = Object.fromEntries(
    Object.keys(row).map((key) => [
      key,
      Number(row[key as keyof LaunchSeedCounts] ?? 0),
    ]),
  ) as LaunchSeedCounts;
  const items = requirements.map((requirement) => ({
    ...requirement,
    actual: counts[requirement.key],
    ready: counts[requirement.key] >= requirement.minimum,
  }));

  return {
    ready: items.every((item) => item.ready),
    checkedAt: new Date(),
    counts,
    items,
  };
}

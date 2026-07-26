import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import { searchListings } from "@/modules/search/service";
import {
  batchRouteSummaries,
  rebuildListingStopAccess,
  rebuildRouteEdges,
} from "@/modules/transport/graph";
import { planJourney } from "@/modules/transport/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 9 verification failed: ${message}`);
}

async function run() {
  await rebuildRouteEdges();
  await rebuildListingStopAccess();

  const edgeCount = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from route_edges
  `);
  const accessCount = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from listing_stop_access
  `);
  assert(Number(edgeCount.rows[0]?.count ?? 0) > 0, "route_edges were not built");
  assert(
    Number(accessCount.rows[0]?.count ?? 0) > 0,
    "listing_stop_access was not built",
  );

  const listing = await db.execute<{
    id: string;
    lat: number;
    lng: number;
    name: string;
  }>(sql`
    select id::text as id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng, name
    from listings
    where status = 'published' and location is not null
    order by name
    limit 1
  `);
  const destination = listing.rows[0];
  assert(destination, "no published listing with coordinates");

  const origin = { lat: 7.0731, lng: 125.6128 };
  const batch = await batchRouteSummaries(origin, [
    {
      id: destination.id,
      lat: Number(destination.lat),
      lng: Number(destination.lng),
    },
  ]);
  const summary = batch.get(destination.id) ?? null;
  assert(summary, "batch graph did not return a route summary for a seeded listing");
  assert(summary.modeled === true, "estimated timings are not labeled modeled");
  assert(
    summary.durationMin > 0 && summary.walkingM >= 0,
    "route summary is missing duration or walking evidence",
  );
  assert(
    summary.confidence === "low" ||
      summary.confidence === "medium" ||
      summary.confidence === "high",
    "route confidence is missing",
  );

  const journey = await planJourney({
    origin,
    originLabel: "Davao City center",
    destination: {
      lat: Number(destination.lat),
      lng: Number(destination.lng),
    },
    destinationLabel: destination.name,
  });
  assert(journey, "transport planner did not use the shared graph engine");
  assert(
    Math.abs(journey.totalDurationMin - summary.durationMin) <= 5,
    "search and transport planner route durations diverge",
  );
  assert(
    journey.disclaimer.toLowerCase().includes("approximate") ||
      journey.disclaimer.toLowerCase().includes("community"),
    "planner disclaimer is missing",
  );

  const originOnly = await searchListings({
    origin,
    limit: 20,
  });
  assert(originOnly.totalCount > 0, "origin-only search removed all listings");
  const withRoute = originOnly.listings.filter((item) => item.route);
  const withoutRoute = originOnly.listings.filter((item) => !item.route);
  assert(
    withRoute.length > 0,
    "origin-only search never attached positive route summaries",
  );
  if (withoutRoute.length)
    assert(
      withoutRoute.every((item) =>
        item.dataWarnings.some((warning) =>
          warning.toLowerCase().includes("route"),
        ),
      ),
      "unknown routes are not disclosed",
    );
  assert(
    withRoute.every((item) => item.route?.modeled !== undefined),
    "search route summaries omit modeled labeling",
  );

  const hardLimit = await searchListings({
    origin,
    route: { maxDurationMin: 1, required: true },
    limit: 20,
  });
  assert(
    hardLimit.totalCount === 0,
    "impossible max-duration hard filter did not return exact-empty",
  );
  assert(
    hardLimit.diagnostics.failedConstraints[0]
      ?.toLowerCase()
      .includes("route"),
    "hard route failure diagnostics are missing",
  );

  const missingOrigin = await searchListings({
    origin,
    route: { required: true, maxTransfers: 0 },
    limit: 50,
  });
  for (const item of missingOrigin.listings)
    assert(item.route !== null, "required route filter admitted a null route");

  const warm: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    warm.push(
      (
        await searchListings({
          origin,
          route: { maxDurationMin: 240 },
          limit: 20,
        })
      ).timing.durationMs,
    );
  }
  warm.sort((a, b) => a - b);
  assert(
    warm[4]! < 800,
    `route-aware warm p95 ${warm[4]}ms exceeds the 800ms development budget`,
  );

  console.log("Search 2.0 Phase 9 origin-aware route verification passed");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

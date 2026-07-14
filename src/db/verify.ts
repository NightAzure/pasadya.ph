import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";

const requiredTables = [
  "users",
  "businesses",
  "listings",
  "listing_media",
  "amenities",
  "listing_amenities",
  "bookings",
  "payments",
  "webhook_events",
  "claim_requests",
  "reviews",
  "review_media",
  "crowd_reports",
  "transport_routes",
  "route_stops",
  "route_segments",
  "ferry_schedules",
  "route_contributions",
  "collections",
  "jobs",
  "audit_log",
  "moderation_queue",
];

async function run() {
  const extensions = await db.execute<{ extname: string }>(sql`
    select extname from pg_extension where extname in ('postgis', 'pg_trgm')
  `);
  const installedExtensions = new Set(
    extensions.rows.map((row) => row.extname),
  );

  for (const extension of ["postgis", "pg_trgm"]) {
    if (!installedExtensions.has(extension)) {
      throw new Error(`Missing required extension: ${extension}`);
    }
  }

  const tables = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `);
  const existingTables = new Set(tables.rows.map((row) => row.table_name));

  for (const table of requiredTables) {
    if (!existingTables.has(table)) {
      throw new Error(`Missing required table: ${table}`);
    }
  }

  const amenities = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from amenities
  `);
  const gistIndexes = await db.execute<{ indexname: string }>(sql`
    select indexname
    from pg_indexes
    where indexname in (
      'listings_location_gist_idx',
      'route_stops_location_gist_idx',
      'transport_routes_geometry_gist_idx'
    )
  `);

  if (Number(amenities.rows[0]?.count ?? 0) < 12) {
    throw new Error("Amenities seed data is incomplete");
  }

  if (gistIndexes.rows.length < 3) {
    throw new Error("Expected PostGIS GiST indexes are missing");
  }

  const transportCounts = await db.execute<{
    routes: string;
    stops: string;
    segments: string;
    ferries: string;
  }>(sql`
    select
      (select count(*) from transport_routes)::text as routes,
      (select count(*) from route_stops)::text as stops,
      (select count(*) from route_segments)::text as segments,
      (select count(*) from ferry_schedules)::text as ferries
  `);
  const transport = transportCounts.rows[0];
  if (
    !transport ||
    Number(transport.routes) < 1 ||
    Number(transport.stops) < 2 ||
    Number(transport.ferries) < 1
  ) {
    throw new Error("Transport seed data is incomplete");
  }

  console.log("Database verification passed");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

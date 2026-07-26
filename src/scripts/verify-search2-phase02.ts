import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import {
  backfillSearch2DataTrust,
  getSearch2DataQualityReport,
} from "@/db/search2-data-trust";

const requiredTables = [
  "areas",
  "area_aliases",
  "listing_aliases",
  "listing_opening_hours",
  "listing_special_hours",
  "listing_sources",
  "listing_field_provenance",
];

const requiredIndexes = [
  "areas_slug_unique",
  "listings_canonical_area_id_idx",
  "listing_sources_identity_unique",
  "listing_field_provenance_canonical_unique",
  "listing_opening_hours_listing_day_unique",
  "listing_special_hours_listing_date_unique",
  "listing_aliases_alias_trgm_idx",
];

const requiredConstraints = [
  "listings_hours_timezone_nonblank",
  "listing_sources_source_url_http_check",
];

async function run() {
  const first = await backfillSearch2DataTrust();
  const second = await backfillSearch2DataTrust();
  if (second.mappedListings !== 0) {
    throw new Error("Search 2.0 Phase 2 backfill is not idempotent.");
  }

  const tables = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `);
  const tableNames = new Set(tables.rows.map((row) => row.table_name));
  for (const table of requiredTables) {
    if (!tableNames.has(table)) {
      throw new Error(`Missing Search 2.0 Phase 2 table: ${table}`);
    }
  }

  const indexes = await db.execute<{ indexname: string }>(sql`
    select indexname from pg_indexes where schemaname = 'public'
  `);
  const indexNames = new Set(indexes.rows.map((row) => row.indexname));
  for (const index of requiredIndexes) {
    if (!indexNames.has(index)) {
      throw new Error(`Missing Search 2.0 Phase 2 index: ${index}`);
    }
  }

  const constraints = await db.execute<{ conname: string }>(sql`
    select conname
    from pg_constraint
    where conname in (
      'listings_hours_timezone_nonblank',
      'listing_sources_source_url_http_check'
    )
  `);
  const constraintNames = new Set(constraints.rows.map((row) => row.conname));
  for (const constraint of requiredConstraints) {
    if (!constraintNames.has(constraint)) {
      throw new Error(`Missing Search 2.0 Phase 2 constraint: ${constraint}`);
    }
  }

  const report = await getSearch2DataQualityReport();
  const listingCount = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from listings
  `);
  if (report.listingCount !== Number(listingCount.rows[0]?.count ?? 0)) {
    throw new Error(
      "Data-quality report does not include every existing listing.",
    );
  }

  const unsafeTrust = await db.execute<{ count: string }>(sql`
    select count(*)::text as count
    from listings
    where location is null
      and location_verification_status in ('verified', 'team_verified')
  `);
  if (Number(unsafeTrust.rows[0]?.count ?? 0) > 0) {
    throw new Error("A missing location was silently classified as verified.");
  }

  const unknownLegacyFields = await db.execute<{ count: string }>(sql`
    select count(*)::text as count
    from listing_field_provenance fp
    join listing_sources ls on ls.id = fp.source_id
    where ls.provider = 'legacy_migration'
      and fp.trust_status <> 'unknown'
  `);
  if (Number(unknownLegacyFields.rows[0]?.count ?? 0) > 0) {
    throw new Error("Legacy backfill data was silently classified as trusted.");
  }

  console.log(
    `Search 2.0 Phase 2 verification passed (${first.report.listingCount} listings; ${report.rows.filter((row) => !row.canonicalAreaId).length} unmappable).`,
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

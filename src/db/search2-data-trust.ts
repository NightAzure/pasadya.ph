import { sql } from "drizzle-orm";

import { db } from "@/db/client";

type Address = {
  province?: unknown;
  municipality?: unknown;
  barangay?: unknown;
};

type AreaInput = {
  slug: string;
  name: string;
  type: "country" | "region" | "province" | "city_municipality" | "barangay";
  parentId: string | null;
};

type ListingAddressRow = {
  id: string;
  address: Address;
};

export type Search2DataQualityRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  canonicalAreaId: string | null;
  hasLocation: boolean;
  locationTrust: string;
  issues: string[];
};

export type Search2DataQualityReport = {
  generatedAt: string;
  listingCount: number;
  rows: Search2DataQualityRow[];
  issueCounts: Record<string, number>;
};

export type Search2BackfillResult = {
  mappedListings: number;
  unmappableListings: number;
  report: Search2DataQualityReport;
};

const LEGACY_SOURCE = "legacy_migration";
const UNKNOWN_PROVENANCE_FIELDS = [
  "pricing",
  "capacity",
  "availability",
  "opening_hours",
  "route",
] as const;

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isDavaoProvince(value: string) {
  return ["davao del norte", "davao del sur"].includes(value.toLowerCase());
}

async function ensureArea(input: AreaInput) {
  await db.execute(sql`
    insert into areas (parent_id, type, name, slug)
    values (
      ${input.parentId}::uuid,
      ${input.type}::area_type,
      ${input.name},
      ${input.slug}
    )
    on conflict (slug) do nothing
  `);

  const result = await db.execute<{ id: string }>(sql`
    select id::text as id from areas where slug = ${input.slug} limit 1
  `);
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error(`Unable to resolve Search 2.0 area: ${input.slug}`);
  }

  return id;
}

async function ensureAreaAlias(
  areaId: string,
  alias: string,
  type: "alternate" | "local" = "alternate",
) {
  await db.execute(sql`
    insert into area_aliases (area_id, alias, normalized_alias, type)
    values (${areaId}::uuid, ${alias}, ${slugify(alias)}, ${type}::alias_type)
    on conflict (area_id, normalized_alias) do nothing
  `);
}

async function ensureLegacySource(listingId: string) {
  const existing = await db.execute<{ id: string }>(sql`
    select id::text as id
    from listing_sources
    where listing_id = ${listingId}::uuid
      and provider = ${LEGACY_SOURCE}
      and external_identifier is null
    order by created_at asc
    limit 1
  `);
  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }

  const inserted = await db.execute<{ id: string }>(sql`
    insert into listing_sources (
      listing_id,
      provider,
      rights_classification,
      retention_classification
    )
    values (
      ${listingId}::uuid,
      ${LEGACY_SOURCE},
      'unknown'::source_rights_classification,
      'unknown'::source_retention_classification
    )
    returning id::text as id
  `);
  const id = inserted.rows[0]?.id;
  if (!id) {
    throw new Error(`Unable to create legacy source for listing ${listingId}`);
  }

  return id;
}

async function ensureUnknownCanonicalProvenance(
  listingId: string,
  sourceId: string,
  fieldName: string,
) {
  await db.execute(sql`
    insert into listing_field_provenance (
      listing_id,
      field_name,
      source_id,
      trust_status,
      is_canonical,
      source_note
    )
    values (
      ${listingId}::uuid,
      ${fieldName},
      ${sourceId}::uuid,
      'unknown'::listing_trust_status,
      true,
      'Legacy value retained without verification during the Search 2.0 Phase 2 backfill.'
    )
    on conflict do nothing
  `);
}

export async function getSearch2DataQualityReport(): Promise<Search2DataQualityReport> {
  const result = await db.execute<Search2DataQualityRow>(sql`
    select
      l.id::text as id,
      l.slug,
      l.name,
      l.status::text as status,
      l.canonical_area_id::text as "canonicalAreaId",
      (l.location is not null) as "hasLocation",
      l.location_verification_status::text as "locationTrust",
      array_remove(array[
        case when l.canonical_area_id is null then 'missing_canonical_area' end,
        case when lower(coalesce(l.address->>'municipality', '')) = 'davao city'
          and lower(coalesce(l.address->>'province', '')) = 'davao del sur'
          then 'legacy_address_hierarchy_conflict' end,
        case when l.location is null then 'missing_location' end,
        case when l.location is not null
          and l.location_verification_status not in ('verified', 'team_verified')
          then 'unverified_location' end,
        case when rates.active_rate_count = 0 or l.price_min is null
          then 'missing_or_ambiguous_pricing' end,
        case when not rates.has_capacity then 'missing_capacity' end,
        case when l.attributes = '{}'::jsonb then 'missing_category_attributes' end,
        case when l.category = 'restaurant' and not hours.has_weekly_hours
          then 'missing_weekly_hours' end,
        case when not routes.has_fresh_route_evidence
          then 'missing_or_stale_route_data' end,
        case when not sources.has_verified_source_information
          then 'unverified_source_information' end
      ], null) as issues
    from listings l
    left join lateral (
      select
        count(*)::integer as active_rate_count,
        bool_or(coalesce(rp.max_pax, 0) > 0) as has_capacity
      from rate_plans rp
      where rp.listing_id = l.id and rp.active = true
    ) rates on true
    left join lateral (
      select exists(
        select 1 from listing_opening_hours oh where oh.listing_id = l.id
      ) as has_weekly_hours
    ) hours on true
    left join lateral (
      select exists(
        select 1
        from listing_field_provenance fp
        where fp.listing_id = l.id
          and fp.field_name = 'route'
          and fp.is_canonical = true
          and fp.trust_status in ('verified', 'team_verified')
          and (fp.valid_until is null or fp.valid_until >= now())
      ) as has_fresh_route_evidence
    ) routes on true
    left join lateral (
      select exists(
        select 1
        from listing_sources ls
        where ls.listing_id = l.id
          and ls.rights_classification <> 'unknown'
          and ls.retention_classification <> 'unknown'
          and ls.last_verified_at is not null
      ) as has_verified_source_information
    ) sources on true
    order by l.created_at asc, l.id asc
  `);

  const rows = result.rows.map((row) => ({
    ...row,
    issues: row.issues ?? [],
  }));
  const issueCounts: Record<string, number> = {};
  for (const row of rows) {
    for (const issue of row.issues) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    listingCount: rows.length,
    rows,
    issueCounts,
  };
}

export async function backfillSearch2DataTrust(): Promise<Search2BackfillResult> {
  const philippinesId = await ensureArea({
    slug: "philippines",
    name: "Philippines",
    type: "country",
    parentId: null,
  });
  const davaoRegionId = await ensureArea({
    slug: "davao-region",
    name: "Davao Region",
    type: "region",
    parentId: philippinesId,
  });

  const addresses = await db.execute<ListingAddressRow>(sql`
    select id::text as id, address from listings order by created_at asc, id asc
  `);

  let mappedListings = 0;
  for (const listing of addresses.rows) {
    const province = stringValue(listing.address.province);
    const municipality = stringValue(listing.address.municipality);
    const barangay = stringValue(listing.address.barangay);
    let canonicalAreaId: string | null = null;
    let provinceId: string | null = null;
    let municipalityId: string | null = null;
    let municipalitySlug: string | null = null;

    if (province) {
      const provinceSlug = slugify(province);
      provinceId = await ensureArea({
        slug: provinceSlug,
        name: province,
        type: "province",
        parentId: isDavaoProvince(province) ? davaoRegionId : philippinesId,
      });
      canonicalAreaId = provinceId;
    }

    if (municipality) {
      const normalizedMunicipality = municipality.toLowerCase();
      const isSamal = normalizedMunicipality === "samal";
      const isDavaoCity = normalizedMunicipality === "davao city";
      municipalitySlug = isSamal
        ? "samal"
        : isDavaoCity
          ? "davao-city"
          : `municipality-${province ? slugify(province) : "philippines"}-${slugify(municipality)}`;
      municipalityId = await ensureArea({
        slug: municipalitySlug,
        name: isSamal ? "Island Garden City of Samal" : municipality,
        type: "city_municipality",
        parentId: isDavaoCity ? davaoRegionId : (provinceId ?? philippinesId),
      });
      canonicalAreaId = municipalityId;

      if (isSamal) {
        await ensureAreaAlias(municipalityId, "Samal", "local");
        await ensureAreaAlias(municipalityId, "IGaCoS", "local");
      }
    }

    if (barangay && municipalityId && municipalitySlug) {
      canonicalAreaId = await ensureArea({
        slug: `barangay-${municipalitySlug}-${slugify(barangay)}`,
        name: barangay,
        type: "barangay",
        parentId: municipalityId,
      });
    }

    if (canonicalAreaId) {
      const update = await db.execute(sql`
        update listings
        set canonical_area_id = ${canonicalAreaId}::uuid,
            location_source = case
              when location is not null and location_source = 'unknown'
                then 'seeded'::location_source
              else location_source
            end,
            location_accuracy = case
              when location is not null and location_accuracy = 'unknown'
                then 'unknown'::location_accuracy
              else location_accuracy
            end,
            location_verification_status = case
              when location_verification_status is null then 'unknown'::listing_trust_status
              else location_verification_status
            end
        where id = ${listing.id}::uuid
          and canonical_area_id is null
      `);
      if ((update.rowCount ?? 0) > 0) {
        mappedListings += 1;
      }
    }

    const sourceId = await ensureLegacySource(listing.id);
    if (canonicalAreaId || listing.address) {
      await ensureUnknownCanonicalProvenance(listing.id, sourceId, "location");
    }
    for (const fieldName of UNKNOWN_PROVENANCE_FIELDS) {
      await ensureUnknownCanonicalProvenance(listing.id, sourceId, fieldName);
    }
  }

  const report = await getSearch2DataQualityReport();
  return {
    mappedListings,
    unmappableListings: report.rows.filter((row) => !row.canonicalAreaId)
      .length,
    report,
  };
}

import { sql } from "drizzle-orm";
import type { Session } from "next-auth";

import { db, pool } from "@/db/client";
import { isLaunchCoordinate } from "@/lib/launch-region";
import {
  assignAdminAreas,
  createAdminListing,
  getDataQualityAudits,
  recordAdminDuplicateReview,
  repairAdminLocation,
  repairAdminPrimaryRate,
  repairAdminProvenance,
  updateAdminListing,
} from "@/modules/admin";
import { searchLaunchAddresses } from "@/modules/geocoding";
import { getPortalActor } from "@/modules/portal/service";

const marker = `Search 2 Phase 3 verification ${Date.now()}`;
const evidenceUrl = "https://evidence.example.test/search2-phase03";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function rejects(work: () => Promise<unknown>, message: string) {
  let rejected = false;
  try {
    await work();
  } catch (error) {
    rejected = error instanceof Error;
  }
  assert(rejected, message);
}

async function verifyOwnerAddressSearch() {
  const previousKey = process.env.MAPTILER_API_KEY;
  process.env.MAPTILER_API_KEY = "replace-with-maptiler-api-key";

  try {
    await rejects(
      () => searchLaunchAddresses("ab"),
      "Address search accepted a query shorter than three characters.",
    );

    const development = await searchLaunchAddresses("Babak");
    assert(
      development.source === "development" &&
        development.suggestions.length > 0,
      "Development geocoder did not return Samal fixtures.",
    );
    assert(
      development.suggestions.every((item) =>
        isLaunchCoordinate(item.latitude, item.longitude),
      ),
      "Development geocoder returned coordinates outside the launch envelope.",
    );

    process.env.MAPTILER_API_KEY = "phase03-maptiler-test-key";
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      assert(
        url.includes("api.maptiler.com/geocoding/") &&
          url.includes("key=phase03-maptiler-test-key") &&
          url.includes("country=ph") &&
          url.includes("bbox="),
        "MapTiler request did not use the expected launch-scoped parameters.",
      );
      return new Response(
        JSON.stringify({
          attribution: "© MapTiler © OpenStreetMap contributors",
          features: [
            {
              id: "poi.100",
              text: "Babak Wharf",
              place_name:
                "Babak Wharf, Island Garden City of Samal, Davao del Norte, Philippines",
              center: [125.6872, 7.1285],
              place_type: ["poi"],
              context: [
                { id: "locality.1", text: "Babak" },
                { id: "municipality.1", text: "Island Garden City of Samal" },
                { id: "region.1", text: "Davao del Norte" },
              ],
            },
            {
              id: "place.999",
              text: "Manila",
              place_name: "Manila, Metro Manila, Philippines",
              center: [120.9842, 14.5995],
              place_type: ["place"],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const live = await searchLaunchAddresses("Babak Wharf", { fetchImpl });
    assert(live.source === "maptiler", "Live geocoder path was not selected.");
    assert(
      live.suggestions.length === 1 &&
        live.suggestions[0]?.placeName.includes("Babak Wharf"),
      "Live geocoder did not keep only launch-area matches.",
    );
    assert(
      live.suggestions[0]?.barangay === "Babak" &&
        live.suggestions[0]?.municipality ===
          "Island Garden City of Samal",
      "Live geocoder did not map address components from MapTiler context.",
    );
  } finally {
    if (previousKey === undefined) delete process.env.MAPTILER_API_KEY;
    else process.env.MAPTILER_API_KEY = previousKey;
  }
}

async function run() {
  await verifyOwnerAddressSearch();

  const admin = await db.execute<{ id: string }>(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values ('search2-phase03-admin@example.test', 'Search 2 Phase 3 Admin', 'admin'::user_role, 'email'::auth_provider, now())
    on conflict (email) do update set role = 'admin'::user_role
    returning id::text as id
  `);
  const actorId = admin.rows[0]?.id;
  assert(actorId, "Admin verification actor was not created.");
  const adminSession = { user: { id: actorId, role: "admin" } } as Session;
  const moderatorSession = {
    user: { id: actorId, role: "moderator" },
  } as Session;
  const authenticatedAdmin = await getPortalActor({
    session: adminSession,
    minimumRole: "admin",
  });
  assert(
    authenticatedAdmin.id === actorId && authenticatedAdmin.role === "admin",
    "Admin action boundary did not allow an admin session.",
  );
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    await rejects(
      () => getPortalActor({ session: moderatorSession, minimumRole: "admin" }),
      "Admin action boundary allowed a moderator session.",
    );
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  }

  const area = await db.execute<{ id: string }>(sql`
    select id::text as id from areas order by created_at limit 1
  `);
  const areaId = area.rows[0]?.id;
  assert(areaId, "An area fixture is required for Phase 3 verification.");

  const source = await createAdminListing(
    { name: `${marker} Source`, category: "resort", status: "draft" },
    actorId,
  );
  const candidate = await createAdminListing(
    { name: `${marker} Candidate`, category: "resort", status: "draft" },
    actorId,
  );

  try {
    await rejects(
      () =>
        repairAdminLocation(
          source.id,
          {
            latitude: 8,
            longitude: 126,
            evidenceUrl,
            sourceNote: "Out of bounds without the required admin override.",
          },
          actorId,
        ),
      "Out-of-region coordinate repair accepted without an override reason.",
    );

    await repairAdminLocation(
      source.id,
      {
        latitude: 7.083,
        longitude: 125.62,
        canonicalAreaId: areaId,
        resolvedAddress: "Babak, Samal, Davao del Norte",
        evidenceUrl,
        sourceNote: "Checked against the team field survey reference.",
      },
      actorId,
    );
    const repaired = await db.execute<{
      displayName: string | null;
      latitude: number;
      longitude: number;
      sourceUrl: string | null;
    }>(sql`
      select l.address ->> 'displayName' as "displayName",
        ST_Y(l.location::geometry) as latitude, ST_X(l.location::geometry) as longitude,
        (select ls.source_url from listing_sources ls where ls.listing_id = l.id order by ls.created_at desc limit 1) as "sourceUrl"
      from listings l where l.id = ${source.id}::uuid
    `);
    assert(
      repaired.rows[0]?.displayName === "Babak, Samal, Davao del Norte" &&
        repaired.rows[0]?.latitude === 7.083 &&
        repaired.rows[0]?.sourceUrl === evidenceUrl,
      "Location repair did not persist address, coordinates, and evidence.",
    );

    await rejects(
      () =>
        assignAdminAreas(
          {
            listingIds: [source.id, "00000000-0000-0000-0000-000000000000"],
            canonicalAreaId: areaId,
            notes: "Must roll back when a selected listing is missing.",
          },
          actorId,
        ),
      "Bulk area assignment allowed a missing listing.",
    );
    const afterFailedAreaAssignment = await db.execute<{
      canonicalAreaId: string | null;
    }>(sql`
      select canonical_area_id::text as "canonicalAreaId" from listings where id = ${source.id}::uuid
    `);
    assert(
      afterFailedAreaAssignment.rows[0]?.canonicalAreaId === areaId,
      "Rejected bulk area assignment changed an existing listing.",
    );
    await assignAdminAreas(
      {
        listingIds: [source.id, candidate.id],
        canonicalAreaId: areaId,
        notes: "Verified launch-area assignment.",
      },
      actorId,
    );
    const assignedAreas = await db.execute<{
      id: string;
      canonicalAreaId: string | null;
    }>(sql`
      select id::text as id, canonical_area_id::text as "canonicalAreaId"
      from listings where id in (${source.id}::uuid, ${candidate.id}::uuid)
    `);
    assert(
      assignedAreas.rows.length === 2 &&
        assignedAreas.rows.every((row) => row.canonicalAreaId === areaId),
      "Bulk area assignment did not update every selected listing.",
    );

    const rate = await db.execute<{ id: string }>(sql`
      insert into rate_plans (listing_id, name, type, price, price_unit, min_pax, max_pax, billing_period, billing_unit, included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label, available_quantity, active)
      values (${source.id}::uuid, 'Verifier cottage', 'package'::rate_plan_type, 250000, 'flat'::price_unit, 1, 4, 'day', 'group', 4, 0, 4, 'cottage', 2, true)
      returning id::text as id
    `);
    const rateId = rate.rows[0]?.id;
    assert(rateId, "Primary-rate fixture was not created.");
    await rejects(
      () =>
        repairAdminPrimaryRate(
          candidate.id,
          { rateId, evidenceUrl, notes: "Wrong listing must be denied." },
          actorId,
        ),
      "Primary-rate repair accepted a rate belonging to another listing.",
    );
    await repairAdminPrimaryRate(
      source.id,
      {
        rateId,
        evidenceUrl,
        notes: "Checked rate card against owner evidence.",
      },
      actorId,
    );

    await rejects(
      () =>
        repairAdminProvenance(
          source.id,
          {
            fieldName: "hours",
            trustStatus: "team_verified",
            sourceNote: "Team verification requires a reviewable source.",
          },
          actorId,
        ),
      "Team verification accepted without a reviewable evidence URL.",
    );
    await repairAdminProvenance(
      source.id,
      {
        fieldName: "hours",
        trustStatus: "team_verified",
        evidenceUrl,
        sourceNote: "Verified opening hours against the signed owner schedule.",
      },
      actorId,
    );

    await recordAdminDuplicateReview(
      {
        sourceListingId: source.id,
        candidateListingId: candidate.id,
        decision: "not_duplicate",
        notes: "Different operators and addresses after team review.",
      },
      actorId,
    );
    await recordAdminDuplicateReview(
      {
        sourceListingId: source.id,
        candidateListingId: candidate.id,
        decision: "needs_merge_review",
        notes: "Keep this documented escalation as the current decision.",
      },
      actorId,
    );
    const audits = await getDataQualityAudits(source.id);
    assert(
      audits.some(
        (audit) =>
          audit.action === "admin.data_quality.location_repair" &&
          audit.changes.evidenceUrl === evidenceUrl,
      ) &&
        audits.some(
          (audit) =>
            audit.action === "admin.data_quality.duplicate_review" &&
            audit.changes.decision === "needs_merge_review",
        ),
      "Phase 3 audit timeline did not expose repair and duplicate decisions.",
    );
    assert(
      audits.some((audit) => audit.action === "admin.data_quality.area_assign"),
      "Bulk area assignment did not create a listing audit entry.",
    );

    await updateAdminListing(source.id, { status: "published" }, actorId);
    const published = await db.execute<{ status: string }>(sql`
      select status from listings where id = ${source.id}::uuid
    `);
    assert(
      published.rows[0]?.status === "published",
      "Publish guard rejected complete in-bounds data.",
    );

    await repairAdminLocation(
      candidate.id,
      {
        latitude: 8,
        longitude: 126,
        evidenceUrl,
        overrideReason:
          "Team-approved exception while the reviewed polygon is pending.",
        sourceNote: "Coordinate verified from the team inspection record.",
      },
      actorId,
    );
    await db.execute(sql`
      insert into rate_plans (listing_id, name, type, price, price_unit, min_pax, max_pax, billing_period, billing_unit, included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label, available_quantity, active, is_primary)
      values (${candidate.id}::uuid, 'Override verifier rate', 'package'::rate_plan_type, 250000, 'flat'::price_unit, 1, 4, 'day', 'group', 4, 0, 4, 'cottage', 2, true, true)
    `);
    await updateAdminListing(candidate.id, { status: "published" }, actorId);
    const override = await db.execute<{
      reason: string | null;
      status: string;
    }>(sql`
      select location_override_reason as reason, status from listings where id = ${candidate.id}::uuid
    `);
    assert(
      Boolean(override.rows[0]?.reason) &&
        override.rows[0]?.status === "published",
      "Durable approved location override did not satisfy the controlled publish path.",
    );
  } finally {
    await db.execute(
      sql`delete from listings where id in (${source.id}::uuid, ${candidate.id}::uuid)`,
    );
  }

  console.log("Search 2.0 Phase 3 mutation verification passed");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

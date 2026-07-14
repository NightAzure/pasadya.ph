import { sql } from "drizzle-orm";
import { ZodError } from "zod";

import { db, pool } from "@/db/client";
import { AuthorizationError } from "@/lib/rbac";
import { crowdLabel, getListingBySlug } from "@/modules/listings/search";
import {
  approveClaim,
  getClaimModerationQueue,
  getOwnerDashboard,
  rejectClaim,
  setAvailabilityBlock,
  setBusinessCrowd,
  submitClaim,
  updateOwnerListing,
} from "@/modules/portal/service";
import {
  createDevSignedUpload,
  photoUploadSchema,
} from "@/modules/portal/upload";

const instantClaimSlug = "babak-harbor-day-resort";
const emailClaimSlug = "lanang-airport-pension";
const manualClaimSlug = "talicud-blue-cove-cottages";
const photoClaimSlug = "matina-garden-stay";
const transferClaimSlug = "kaputian-tide-beach-resort";

async function run() {
  await resetPhase04Rows();
  const owner = await ensureUser(
    "phase04-owner@example.test",
    "Phase 04 Owner",
  );
  const otherUser = await ensureUser(
    "phase04-other@example.test",
    "Phase 04 Other User",
  );
  const admin = await ensureUser(
    "phase04-admin@example.test",
    "Phase 04 Admin",
    "admin",
  );

  const instantResult = await submitClaim(
    {
      listingSlug: instantClaimSlug,
      claimantName: "Phase 04 Owner",
      contactEmail: "phase04-owner@example.test",
      contactPhone: "+639180400001",
      method: "phone_otp",
      otpCode: "123456",
      notes: "Development instant verification.",
    },
    owner.id,
  );

  assert(instantResult.status === "approved", "Phone OTP claim auto-approved");
  const emailResult = await submitClaim(
    {
      listingSlug: emailClaimSlug,
      claimantName: "Phase 04 Owner",
      contactEmail: "phase04-owner@example.test",
      contactPhone: "+639180400001",
      method: "email",
      notes: "Development email verification.",
    },
    owner.id,
  );
  assert(emailResult.status === "approved", "Email claim auto-approved");

  const instantListing = await getDbListingBySlug(instantClaimSlug);
  assert(
    instantListing?.claim_status === "claimed" && instantListing.business_id,
    "Approved claim assigned business ownership",
  );

  await updateOwnerListing(
    {
      listingId: instantListing.id,
      name: "Babak Harbor Day Resort - Owner Updated",
      description:
        "Owner-managed development listing with updated rates, contact details, amenities, and photos for Phase 04 verification.",
      barangay: "Babak",
      municipality: "Samal",
      province: "Davao del Norte",
      contactPhone: "+639180400001",
      contactFacebook: "https://facebook.com/phase04-owner",
      contactWebsite: "https://example.test/phase04-owner",
      amenitySlugs: ["pool", "parking"],
      rateName: "Owner day pass",
      rateType: "entrance",
      ratePricePhp: 175,
      rateUnit: "per_person",
      rateDescription: "Updated owner-managed day-use rate.",
      photoUrl: "/listings/samal-beach-resort-placeholder.png",
      photoFileName: "owner-photo.jpg",
      photoContentType: "image/jpeg",
      photoSizeBytes: 204800,
    },
    owner.id,
  );

  let ownerDenied = false;
  try {
    await updateOwnerListing(
      {
        listingId: instantListing.id,
        name: "Should fail",
        description:
          "This update should fail because the actor does not own this listing.",
        barangay: "Babak",
        municipality: "Samal",
        province: "Davao del Norte",
        rateName: "Invalid rate",
        ratePricePhp: 1,
      },
      otherUser.id,
    );
  } catch (error) {
    ownerDenied = error instanceof AuthorizationError;
  }
  assert(ownerDenied, "Non-owner listing edit was denied");

  await setAvailabilityBlock(
    {
      listingId: instantListing.id,
      date: "2026-08-15",
      available: "false",
      quantity: 0,
    },
    owner.id,
  );
  await setAvailabilityBlock(
    {
      listingId: instantListing.id,
      date: "2026-08-15",
      available: "true",
      quantity: 2,
    },
    owner.id,
  );

  await setBusinessCrowd(
    {
      listingId: instantListing.id,
      level: "busy",
    },
    owner.id,
  );

  const listingState = await db.execute<{
    availabilityCount: string;
    crowdCount: string;
    crowdLevel: string | null;
    mediaCount: string;
    rateCount: string;
  }>(sql`
    select
      (select count(*)::text from availability_blocks where listing_id = l.id and date = '2026-08-15') as "availabilityCount",
      (select count(*)::text from crowd_reports where listing_id = l.id and source = 'business' and expires_at > now()) as "crowdCount",
      l.attributes ->> 'crowd_level' as "crowdLevel",
      (select count(*)::text from listing_media where listing_id = l.id and uploaded_by = ${owner.id}::uuid) as "mediaCount",
      (select count(*)::text from rate_plans where listing_id = l.id and name = 'Owner day pass') as "rateCount"
    from listings l
    where l.id = ${instantListing.id}::uuid
  `);
  const state = listingState.rows[0];
  assert(state?.availabilityCount === "1", "Availability change persisted");
  assert(state?.crowdCount === "1", "Business crowd report persisted");
  assert(state?.crowdLevel === "busy", "Public crowd attribute refreshed");
  assert(state?.mediaCount === "1", "Owner photo metadata persisted");
  assert(state?.rateCount === "1", "Owner rate persisted");

  await submitClaim(
    {
      listingSlug: manualClaimSlug,
      claimantName: "Phase 04 Owner",
      contactEmail: "phase04-owner@example.test",
      contactPhone: "+639180400001",
      method: "document",
      fileName: "permit.pdf",
      contentType: "application/pdf",
      sizeBytes: 512000,
      notes: "Manual document verification.",
    },
    owner.id,
  );

  let queue = await getClaimModerationQueue();
  const manualClaim = queue.find(
    (claim) => claim.listingSlug === manualClaimSlug,
  );
  assert(Boolean(manualClaim), "Document claim appeared in moderation queue");

  let duplicateClaimRejected = false;
  try {
    await submitClaim(
      {
        listingSlug: manualClaimSlug,
        claimantName: "Phase 04 Owner",
        contactEmail: "phase04-owner@example.test",
        contactPhone: "+639180400001",
        method: "document",
        fileName: "second-permit.pdf",
        contentType: "application/pdf",
        sizeBytes: 1024,
      },
      owner.id,
    );
  } catch {
    duplicateClaimRejected = true;
  }
  assert(duplicateClaimRejected, "Active claim state blocks duplicate claims");

  await approveClaim(manualClaim!.claimId, admin.id);
  const manualListing = await getDbListingBySlug(manualClaimSlug);
  assert(
    manualListing?.claim_status === "claimed" && manualListing.business_id,
    "Approved manual claim assigned business ownership",
  );
  let repeatedApproveRejected = false;
  try {
    await approveClaim(manualClaim!.claimId, admin.id);
  } catch {
    repeatedApproveRejected = true;
  }
  assert(repeatedApproveRejected, "Reviewed claim cannot be approved twice");

  await submitClaim(
    {
      listingSlug: photoClaimSlug,
      claimantName: "Phase 04 Owner",
      contactEmail: "phase04-owner@example.test",
      contactPhone: "+639180400001",
      method: "photo_verification",
      fileName: "premises.webp",
      contentType: "image/webp",
      sizeBytes: 512000,
      notes: "Photo verification moderation.",
    },
    owner.id,
  );
  queue = await getClaimModerationQueue();
  assert(
    Boolean(queue.find((claim) => claim.listingSlug === photoClaimSlug)),
    "Photo verification claim appeared in moderation queue",
  );

  await submitClaim(
    {
      listingSlug: transferClaimSlug,
      claimantName: "Phase 04 Owner",
      contactEmail: "phase04-owner@example.test",
      contactPhone: "+639180400001",
      method: "document",
      fileName: "transfer-proof.pdf",
      contentType: "application/pdf",
      sizeBytes: 256000,
      notes: "Ownership transfer request.",
    },
    owner.id,
  );

  queue = await getClaimModerationQueue();
  const transferClaim = queue.find(
    (claim) => claim.listingSlug === transferClaimSlug,
  );
  assert(Boolean(transferClaim), "Already-claimed transfer request queued");
  assert(
    transferClaim?.claimStatus === "disputed",
    "Already-claimed request uses disputed claim status",
  );
  await rejectClaim(
    transferClaim!.claimId,
    admin.id,
    "Verification script cleanup.",
  );
  const transferListing = await getDbListingBySlug(transferClaimSlug);
  assert(
    transferListing?.claim_status === "claimed",
    "Rejected transfer restores claimed listing state",
  );

  let uploadRejected = false;
  try {
    await submitClaim(
      {
        listingSlug: manualClaimSlug,
        claimantName: "Phase 04 Owner",
        contactEmail: "phase04-owner@example.test",
        contactPhone: "+639180400001",
        method: "document",
        fileName: "script.txt",
        contentType: "text/plain",
        sizeBytes: 100,
      },
      owner.id,
    );
  } catch (error) {
    uploadRejected = error instanceof ZodError;
  }
  assert(uploadRejected, "Upload validation rejects unsupported files");

  let photoRejected = false;
  try {
    await updateOwnerListing(
      {
        listingId: instantListing.id,
        name: "Babak Harbor Day Resort - Bad Photo",
        description:
          "This update should fail because photo metadata is missing for a supplied photo URL.",
        barangay: "Babak",
        municipality: "Samal",
        province: "Davao del Norte",
        rateName: "Bad photo rate",
        ratePricePhp: 150,
        photoUrl: "/listings/samal-beach-resort-placeholder.png",
      },
      owner.id,
    );
  } catch (error) {
    photoRejected = error instanceof ZodError;
  }
  assert(photoRejected, "Owner photo validation rejects missing metadata");

  const signedUploadMetadata = photoUploadSchema.parse({
    fileName: "owner-photo.jpg",
    contentType: "image/jpeg",
    sizeBytes: 204800,
  });
  const signedUpload = createDevSignedUpload(
    signedUploadMetadata,
    "listing-photo",
  );
  assert(
    signedUpload.method === "PUT" && signedUpload.exifGpsStripped,
    "Signed upload dev descriptor includes method and EXIF GPS stripping flag",
  );

  const publicListing = await getListingBySlug(instantClaimSlug);
  assert(
    publicListing &&
      crowdLabel(publicListing.attributes).source.includes("business"),
    "Public listing crowd source label reflects business report",
  );

  const dashboard = await getOwnerDashboard(owner.id);
  assert(dashboard.length >= 2, "Owner dashboard loads claimed listings");

  console.log("Phase 04 verification passed");
}

async function resetPhase04Rows() {
  await db.execute(sql`
    with targets as (
      select id from listings
      where slug in (${instantClaimSlug}, ${emailClaimSlug}, ${manualClaimSlug}, ${photoClaimSlug}, ${transferClaimSlug})
    ),
    target_claims as (
      select id from claim_requests where listing_id in (select id from targets)
    )
    delete from moderation_queue
    where reference_id in (select id from target_claims)
  `);
  await db.execute(sql`
    delete from claim_requests
    where listing_id in (
      select id from listings
      where slug in (${instantClaimSlug}, ${emailClaimSlug}, ${manualClaimSlug}, ${photoClaimSlug}, ${transferClaimSlug})
    )
  `);
  await db.execute(sql`
    delete from availability_blocks
    where listing_id in (
      select id from listings
      where slug in (${instantClaimSlug}, ${emailClaimSlug}, ${manualClaimSlug}, ${photoClaimSlug}, ${transferClaimSlug})
    )
  `);
  await db.execute(sql`
    delete from rate_plans
    where name = 'Owner day pass'
      and listing_id in (
      select id from listings
      where slug in (${instantClaimSlug}, ${emailClaimSlug}, ${manualClaimSlug}, ${photoClaimSlug}, ${transferClaimSlug})
      )
      and not exists (
        select 1
        from bookings
        where bookings.rate_plan_id = rate_plans.id
      )
  `);
  await db.execute(sql`
    delete from crowd_reports
    where listing_id in (
      select id from listings
      where slug in (${instantClaimSlug}, ${emailClaimSlug}, ${manualClaimSlug}, ${photoClaimSlug}, ${transferClaimSlug})
    )
  `);
  await db.execute(sql`
    delete from listing_media
    where uploaded_by in (
      select id from users where email like 'phase04-%@example.test'
    )
  `);
  await db.execute(sql`
    delete from businesses
    where owner_id in (
      select id from users where email like 'phase04-%@example.test'
    )
  `);
  await db.execute(sql`
    update listings
    set business_id = null,
        claim_status = 'unclaimed',
        updated_at = now()
    where slug in (${instantClaimSlug}, ${emailClaimSlug}, ${manualClaimSlug}, ${photoClaimSlug})
  `);
}

async function ensureUser(email: string, name: string, role = "user") {
  await db.execute(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values (${email}, ${name}, ${role}::user_role, 'email', now())
    on conflict (email) do update
    set name = excluded.name,
        role = excluded.role,
        email_verified = excluded.email_verified
  `);

  const result = await db.execute<{ id: string }>(sql`
    select id::text as id from users where email = ${email} limit 1
  `);
  const user = result.rows[0];

  if (!user) {
    throw new Error(`Failed to create verification user ${email}`);
  }

  return user;
}

async function getDbListingBySlug(slug: string) {
  const result = await db.execute<{
    id: string;
    claim_status: string;
    business_id: string | null;
  }>(sql`
    select id::text, claim_status, business_id::text
    from listings
    where slug = ${slug}
    limit 1
  `);

  return result.rows[0];
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(`Phase 04 verification failed: ${message}`);
  }

  console.log(`ok - ${message}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

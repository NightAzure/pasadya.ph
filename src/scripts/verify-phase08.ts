import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import {
  getAdminMetrics,
  listModerationItems,
  resolveModerationItem,
} from "@/modules/admin";
import { getLaunchSeedChecklist } from "@/modules/launch/seed-checklist";
import {
  getPayoutReconciliation,
  listPayoutExportRows,
} from "@/modules/payments";
import {
  createReviewPhoto,
  reportReviewPhoto,
} from "@/modules/community/service";
import {
  createDevSignedUpload,
  photoUploadSchema,
} from "@/modules/portal/upload";

const marker = `Phase 08 verification ${Date.now()}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const listing = await db.execute<{
    id: string;
    status: string;
    publishedAt: Date | null;
    description: string | null;
    contactWebsite: string | null;
  }>(sql`
    select
      id::text,
      status,
      published_at as "publishedAt",
      description,
      contact_website as "contactWebsite"
    from listings
    where status = 'published'::listing_status
    limit 1
  `);
  const listingFixture = listing.rows[0];
  assert(listingFixture, "A listing fixture row was not returned.");
  const listingId = listingFixture?.id;
  assert(
    listingId,
    "A published listing is required for Phase 08 verification.",
  );

  const actor = await db.execute<{ id: string }>(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values ('phase08-admin@example.test', 'Phase 08 Admin', 'admin'::user_role, 'email'::auth_provider, now())
    on conflict (email) do update set role = 'admin'::user_role
    returning id::text
  `);
  const actorId = actor.rows[0]?.id;
  assert(actorId, "Phase 08 admin fixture was not created.");

  const author = await db.execute<{ id: string }>(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values ('phase08-reviewer@example.test', 'Phase 08 Reviewer', 'user'::user_role, 'email'::auth_provider, now())
    on conflict (email) do update set name = excluded.name
    returning id::text
  `);
  const authorId = author.rows[0]?.id;
  assert(authorId, "Phase 08 reviewer fixture was not created.");

  await db.execute(sql`delete from moderation_queue where reason = ${marker}`);
  await db.execute(sql`delete from reviews where body = ${marker}`);

  const review = await db.execute<{ id: string }>(sql`
    insert into reviews (listing_id, user_id, rating, body, status)
    values (${listingId}::uuid, ${authorId}::uuid, 5, ${marker}, 'flagged'::review_status)
    returning id::text
  `);
  const reviewId = review.rows[0]?.id;
  assert(reviewId, "Phase 08 review fixture was not created.");
  const queue = await db.execute<{ id: string }>(sql`
    insert into moderation_queue (type, reference_id, reason)
    values ('review'::moderation_type, ${reviewId}::uuid, ${marker})
    returning id::text
  `);
  const queueId = queue.rows[0]?.id;
  assert(queueId, "Phase 08 moderation fixture was not created.");

  const metrics = await getAdminMetrics();
  assert(
    metrics.pendingModeration >= 1,
    "Admin metrics did not count pending moderation.",
  );
  const pending = await listModerationItems({ type: "review" });
  assert(
    pending.some((item) => item.queueId === queueId),
    "Review was not listed in the moderation queue.",
  );

  await resolveModerationItem(queueId, { decision: "approve" }, actorId);
  const resolved = await db.execute<{
    status: string;
    reviewerId: string | null;
  }>(sql`
    select status, reviewer_id::text as "reviewerId" from moderation_queue where id = ${queueId}::uuid
  `);
  assert(
    resolved.rows[0]?.status === "approved",
    "Moderation item was not approved.",
  );
  assert(
    resolved.rows[0]?.reviewerId === actorId,
    "Moderation reviewer was not recorded.",
  );
  const audit = await db.execute<{ count: number }>(sql`
    select count(*)::integer as count from audit_log where actor_id = ${actorId}::uuid and entity_id = ${reviewId}::uuid and action = 'admin.moderation.approve'
  `);
  assert(
    Number(audit.rows[0]?.count) === 1,
    "Moderation approval did not create an audit entry.",
  );

  const signedReviewPhoto = createDevSignedUpload(
    photoUploadSchema.parse({
      fileName: "phase08.jpg",
      contentType: "image/jpeg",
      sizeBytes: 100_000,
    }),
    "review-photo",
  );
  assert(
    signedReviewPhoto.storageKey.startsWith("review-photo/") &&
      signedReviewPhoto.exifGpsStripped &&
      signedReviewPhoto.processUrl.includes("/api/uploads/process"),
    "Review photo signed-upload scope was not configured.",
  );

  const reviewPhoto = await createReviewPhoto(
    {
      reviewId,
      url: `/uploads/${reviewId}/phase08.jpg`,
      fileName: "phase08.jpg",
      contentType: "image/jpeg",
      sizeBytes: 100_000,
      caption: marker,
    },
    authorId,
  );
  assert(reviewPhoto?.id, "Review photo was not persisted.");
  const photoQueueItems = await listModerationItems({ type: "photo" });
  const photoItem = photoQueueItems.find(
    (item) => item.referenceId === reviewPhoto.id,
  );
  assert(photoItem, "Review photo queue item was not created.");
  assert(
    photoItem.details?.kind === "photo",
    "Review photo details are missing.",
  );
  assert(
    photoItem.details.mediaKind === "review",
    "Review photo was not listed with review-media moderation details.",
  );
  await resolveModerationItem(
    photoItem.queueId,
    { decision: "approve" },
    actorId,
  );
  const approvedPhoto = await db.execute<{ moderated: boolean }>(sql`
    select moderated from review_media where id = ${reviewPhoto.id}::uuid
  `);
  assert(
    approvedPhoto.rows[0]?.moderated === true,
    "Review photo approval did not publish the photo.",
  );
  await reportReviewPhoto(reviewPhoto.id, { reason: marker }, authorId);
  const reportedPhotoItem = (await listModerationItems({ type: "photo" })).find(
    (item) => item.referenceId === reviewPhoto.id,
  );
  assert(
    reportedPhotoItem,
    "Reported review photo queue item was not created.",
  );
  assert(
    reportedPhotoItem.details?.kind === "photo",
    "Reported review photo was not returned to moderation.",
  );
  await resolveModerationItem(
    reportedPhotoItem.queueId,
    { decision: "reject", notes: marker },
    actorId,
  );
  const rejectedPhoto = await db.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from review_media
    where id = ${reviewPhoto.id}::uuid
  `);
  assert(
    Number(rejectedPhoto.rows[0]?.count) === 0,
    "Rejected review photo was not removed.",
  );

  const reportQueue = await db.execute<{ id: string }>(sql`
    insert into moderation_queue (type, reference_id, reason, payload)
    values (
      'listing_report'::moderation_type,
      ${listingId}::uuid,
      ${marker},
      ${JSON.stringify({ reporterId: authorId, reportReason: marker })}::jsonb
    )
    returning id::text
  `);
  const reportQueueId = reportQueue.rows[0]?.id;
  assert(reportQueueId, "Listing report fixture was not created.");
  const listingReportItems = await listModerationItems({
    type: "listing_report",
  });
  const reportItem = listingReportItems.find(
    (item) => item.queueId === reportQueueId,
  );
  assert(
    reportItem?.details?.kind === "listing_report",
    "Listing report details were not loaded.",
  );
  assert(
    reportItem.details.payload.reportReason === marker,
    "Listing report payload was not preserved.",
  );
  await resolveModerationItem(
    reportQueueId,
    {
      decision: "approve",
      listingAction: "unpublish",
      notes: marker,
    },
    actorId,
  );
  const unpublished = await db.execute<{ status: string }>(sql`
    select status from listings where id = ${listingId}::uuid
  `);
  assert(
    unpublished.rows[0]?.status === "closed",
    "Approved listing report did not unpublish the listing.",
  );
  const reportAudit = await db.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from audit_log
    where actor_id = ${actorId}::uuid
      and entity_id = ${listingId}::uuid
      and action = 'admin.listing.report.unpublish'
  `);
  assert(
    Number(reportAudit.rows[0]?.count) >= 1,
    "Listing report action did not create a domain audit entry.",
  );

  const editQueue = await db.execute<{ id: string }>(sql`
    insert into moderation_queue (type, reference_id, reason, payload)
    values (
      'listing_edit'::moderation_type,
      ${listingId}::uuid,
      ${marker},
      ${JSON.stringify({
        reporterId: authorId,
        changes: {
          description: `${marker} suggested description`,
          contactWebsite: "https://example.test/phase08",
        },
      })}::jsonb
    )
    returning id::text
  `);
  const editQueueId = editQueue.rows[0]?.id;
  assert(editQueueId, "Listing edit fixture was not created.");
  await resolveModerationItem(
    editQueueId,
    { decision: "approve", listingAction: "edit", notes: marker },
    actorId,
  );
  const edited = await db.execute<{
    description: string | null;
    contactWebsite: string | null;
  }>(sql`
    select description, contact_website as "contactWebsite"
    from listings
    where id = ${listingId}::uuid
  `);
  assert(
    edited.rows[0]?.description === `${marker} suggested description` &&
      edited.rows[0]?.contactWebsite === "https://example.test/phase08",
    "Approved listing edit did not apply structured changes.",
  );
  const editAudit = await db.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from audit_log
    where actor_id = ${actorId}::uuid
      and entity_id = ${listingId}::uuid
      and action = 'admin.listing.edit.apply'
  `);
  assert(
    Number(editAudit.rows[0]?.count) >= 1,
    "Listing edit action did not create a domain audit entry.",
  );

  const reconciliation = await getPayoutReconciliation(actorId);
  assert(
    reconciliation.summary.totalRows === reconciliation.rows.length,
    "Payout reconciliation summary does not match its rows.",
  );
  const payoutExport = await listPayoutExportRows(actorId);
  assert(Array.isArray(payoutExport), "Payout export rows were not returned.");

  const { createAdminListing, mergeAdminListings, adminManageBooking } =
    await import("@/modules/admin");
  const created = await createAdminListing(
    {
      name: `${marker} Resort`,
      category: "resort",
      status: "draft",
      description: "Phase 08 create listing fixture",
    },
    actorId,
  );
  assert(created.id, "Admin listing create did not return an id.");
  const createAudit = await db.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from audit_log
    where actor_id = ${actorId}::uuid
      and entity_id = ${created.id}::uuid
      and action = 'admin.listing.create'
  `);
  assert(
    Number(createAudit.rows[0]?.count) >= 1,
    "Listing create did not write an audit entry.",
  );

  const mergeSource = await createAdminListing(
    {
      name: `${marker} Duplicate`,
      category: "resort",
      status: "draft",
    },
    actorId,
  );
  const merge = await mergeAdminListings(
    {
      sourceListingId: mergeSource.id,
      targetListingId: created.id,
      notes: `${marker} merge notes`,
      archiveSource: true,
    },
    actorId,
  );
  assert(
    merge.targetListingId === created.id,
    "Listing merge did not target the keep listing.",
  );
  const mergedSource = await db.execute<{ status: string }>(sql`
    select status from listings where id = ${mergeSource.id}::uuid
  `);
  assert(
    mergedSource.rows[0]?.status === "archived",
    "Merged source listing was not archived.",
  );

  const bookingFixture = await db.execute<{ id: string }>(sql`
    insert into bookings (
      listing_id, user_id, status, check_in, check_out, pax,
      guest_name, guest_email, subtotal, downpayment_amount, balance_due, currency
    )
    values (
      ${listingId}::uuid,
      ${authorId}::uuid,
      'confirmed'::booking_status,
      current_date + 14,
      current_date + 16,
      2,
      'Phase 08 Guest',
      'phase08-guest@example.test',
      500000,
      250000,
      250000,
      'PHP'
    )
    returning id::text
  `);
  const bookingId = bookingFixture.rows[0]?.id;
  assert(bookingId, "Booking fixture was not created.");
  await db.execute(sql`
    insert into payments (booking_id, paymongo_session_id, paymongo_payment_id, amount, status, paid_at)
    values (
      ${bookingId}::uuid,
      ${`cs_test_${bookingId.replaceAll("-", "").slice(0, 20)}`},
      ${`pay_test_${bookingId.replaceAll("-", "").slice(0, 20)}`},
      250000,
      'paid'::payment_status,
      now()
    )
  `);

  const dispute = await adminManageBooking(
    bookingId,
    { action: "dispute_note", reason: `${marker} dispute` },
    actorId,
  );
  assert(dispute.action === "dispute_note", "Dispute note action failed.");
  const refund = await adminManageBooking(
    bookingId,
    { action: "refund", reason: `${marker} refund`, refundAmount: 100000 },
    actorId,
  );
  assert(refund.action === "refund", "Admin refund action failed.");

  const { reconcilePaymentRecords } = await import("@/modules/payments");
  const providerReport = await reconcilePaymentRecords({
    includeProvider: true,
    maxProviderChecks: 10,
  });
  assert(
    providerReport.provider &&
      typeof providerReport.provider.checkedCount === "number",
    "Provider reconciliation summary was not attached.",
  );

  const { putDevObject, processUploadedObject } =
    await import("@/modules/storage");
  const { stripExifGps } = await import("@/modules/storage/exif");
  // Minimal JPEG with an APP1 marker so EXIF stripping can prove a rewrite.
  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xd9,
  ]);
  const stripped = stripExifGps(jpeg, "image/jpeg");
  assert(stripped.exifGpsStripped && stripped.changed, "EXIF strip failed.");
  const stored = putDevObject(
    `review-photo/phase08-${Date.now()}.jpg`,
    jpeg,
    "image/jpeg",
  );
  assert(stored.exifGpsStripped, "Dev upload did not strip EXIF GPS.");
  const processed = await processUploadedObject({
    storageKey: stored.storageKey,
    contentType: "image/jpeg",
  });
  assert(processed.exifGpsStripped, "Upload process confirmation failed.");

  const { checkRateLimit, resetRateLimitBuckets } =
    await import("@/lib/rate-limit");
  resetRateLimitBuckets();
  const first = checkRateLimit({
    key: "phase08:verify",
    limit: 2,
    windowMs: 60_000,
  });
  const second = checkRateLimit({
    key: "phase08:verify",
    limit: 2,
    windowMs: 60_000,
  });
  const third = checkRateLimit({
    key: "phase08:verify",
    limit: 2,
    windowMs: 60_000,
  });
  assert(
    first.allowed && second.allowed && !third.allowed,
    "Rate limit failed.",
  );

  const checklist = await getLaunchSeedChecklist();
  assert(
    checklist.items.length >= 9,
    "Launch checklist did not expose all seed checks.",
  );
  assert(
    typeof checklist.ready === "boolean",
    "Launch checklist readiness was not computed.",
  );

  await db.execute(
    sql`delete from moderation_queue where id = ${queueId}::uuid`,
  );
  await db.execute(
    sql`delete from moderation_queue where id in (${reportQueueId}::uuid, ${editQueueId}::uuid)`,
  );
  await db.execute(sql`
    delete from payments where booking_id = ${bookingId}::uuid
  `);
  await db.execute(sql`delete from bookings where id = ${bookingId}::uuid`);
  await db.execute(sql`
    delete from listings where id in (${created.id}::uuid, ${mergeSource.id}::uuid)
  `);
  await db.execute(sql`
    update listings
    set status = ${listingFixture.status}::listing_status,
        published_at = ${listingFixture.publishedAt},
        description = ${listingFixture.description},
        contact_website = ${listingFixture.contactWebsite},
        updated_at = now()
    where id = ${listingId}::uuid
  `);
  await db.execute(
    sql`delete from moderation_queue where reference_id = ${reviewPhoto.id}::uuid`,
  );
  await db.execute(sql`delete from reviews where id = ${reviewId}::uuid`);
  console.log("Phase 08 admin verification passed");
  console.log(
    JSON.stringify({
      pendingReviewQueue: pending.length,
      publishedListings: checklist.counts.publishedListings,
    }),
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

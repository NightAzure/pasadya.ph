import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { getPortalActor } from "@/modules/portal/service";

import {
  adminBookingActionSchema,
  adminDuplicateReviewSchema,
  adminAreaAssignmentSchema,
  adminBookingListQuerySchema,
  adminLocationRepairSchema,
  adminListingCreateSchema,
  adminListingEditChangesSchema,
  adminListingMergeSchema,
  adminListingUpdateSchema,
  adminListingsQuerySchema,
  adminPrimaryRateRepairSchema,
  adminProvenanceRepairSchema,
  moderationListQuerySchema,
  moderationResolutionSchema,
} from "./schemas";
import type {
  AdminActor,
  AdminListing,
  AdminMetrics,
  AdminRoute,
  AdminUser,
  BookingOversightRow,
  ModerationDetails,
  ModerationItem,
  ModerationType,
  PayoutEligibilitySummary,
} from "./types";
import { calculateRefund } from "@/modules/bookings/refunds";
import {
  transitionBookingStatus,
  type BookingStatus,
} from "@/modules/bookings/state";
import { requestPaymongoRefund } from "@/modules/payments";

export class AdminDomainError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AdminDomainError";
  }
}

export async function getAdminActor(
  minimumRole: "moderator" | "admin" = "moderator",
): Promise<AdminActor> {
  const actor = await getPortalActor({ minimumRole });
  return {
    id: actor.id,
    email: actor.email,
    name: actor.name,
    role: actor.role === "admin" ? "admin" : "moderator",
    isDevFallback: actor.isDevFallback,
  };
}

export function adminCapabilities(actor: AdminActor) {
  return {
    role: actor.role,
    moderation: true,
    listings: true,
    bookings: true,
    metrics: true,
    payouts: actor.role === "admin",
  } as const;
}

type ModerationRow = Omit<ModerationItem, "details"> & { details: unknown };

export async function listModerationItems(input: unknown = {}) {
  const query = moderationListQuerySchema.parse(input);
  const result = await db.execute<ModerationRow>(sql`
    select
      mq.id::text as "queueId",
      mq.type,
      mq.reference_id::text as "referenceId",
      mq.status,
      mq.reason,
      mq.reviewer_id::text as "reviewerId",
      mq.reviewer_notes as "reviewerNotes",
      mq.created_at as "createdAt",
      mq.resolved_at as "resolvedAt",
      case
        when mq.type = 'claim' then jsonb_build_object(
          'kind', 'claim',
          'claimId', cr.id::text,
          'listingId', cr.listing_id::text,
          'listingName', claim_listing.name,
          'listingSlug', claim_listing.slug,
          'claimantId', cr.user_id::text,
          'claimantName', claim_user.name,
          'claimantEmail', claim_user.email,
          'method', cr.method,
          'claimStatus', cr.status,
          'verificationData', cr.verification_data
        )
        when mq.type = 'review' then jsonb_build_object(
          'kind', 'review',
          'reviewId', review.id::text,
          'listingId', review.listing_id::text,
          'listingName', review_listing.name,
          'listingSlug', review_listing.slug,
          'authorId', review.user_id::text,
          'authorName', review_user.name,
          'authorEmail', review_user.email,
          'rating', review.rating,
          'body', review.body,
          'reviewStatus', review.status
        )
        when mq.type = 'photo' and photo.id is not null then jsonb_build_object(
          'kind', 'photo',
          'mediaKind', 'listing',
          'mediaId', photo.id::text,
          'listingId', photo.listing_id::text,
          'listingName', photo_listing.name,
          'listingSlug', photo_listing.slug,
          'reviewId', null,
          'url', photo.url,
          'caption', photo.caption,
          'uploadedBy', photo.uploaded_by::text,
          'moderated', photo.moderated
        )
        when mq.type = 'photo' and review_photo.id is not null then jsonb_build_object(
          'kind', 'photo',
          'mediaKind', 'review',
          'mediaId', review_photo.id::text,
          'listingId', review_photo_listing.id::text,
          'listingName', review_photo_listing.name,
          'listingSlug', review_photo_listing.slug,
          'reviewId', review_photo.review_id::text,
          'url', review_photo.url,
          'caption', review_photo.caption,
          'uploadedBy', review_photo.uploaded_by::text,
          'moderated', review_photo.moderated
        )
        when mq.type = 'route_contribution' then jsonb_build_object(
          'kind', 'route_contribution',
          'contributionId', contribution.id::text,
          'contributorId', contribution.user_id::text,
          'contributorName', contribution_user.name,
          'contributorEmail', contribution_user.email,
          'contributionType', contribution.type,
          'contributionStatus', contribution.status,
          'data', contribution.data
        )
        when mq.type in ('listing_report', 'listing_edit') then jsonb_build_object(
          'kind', mq.type,
          'listingId', moderation_listing.id::text,
          'listingName', moderation_listing.name,
          'listingSlug', moderation_listing.slug,
          'listingStatus', moderation_listing.status,
          'claimStatus', moderation_listing.claim_status,
          'businessName', moderation_business.display_name,
          'description', moderation_listing.description,
          'address', moderation_listing.address,
          'attributes', moderation_listing.attributes,
          'priceMin', moderation_listing.price_min,
          'priceMax', moderation_listing.price_max,
          'bookingMode', moderation_listing.booking_mode,
          'cancellationPolicy', moderation_listing.cancellation_policy,
          'downpaymentPct', moderation_listing.downpayment_pct,
          'contactPhone', moderation_listing.contact_phone,
          'contactFacebook', moderation_listing.contact_facebook,
          'contactWebsite', moderation_listing.contact_website,
          'payload', coalesce(mq.payload, '{}'::jsonb)
        )
        else null
      end as details
    from moderation_queue mq
    left join claim_requests cr
      on mq.type = 'claim' and cr.id = mq.reference_id
    left join listings claim_listing on claim_listing.id = cr.listing_id
    left join users claim_user on claim_user.id = cr.user_id
    left join reviews review
      on mq.type = 'review' and review.id = mq.reference_id
    left join listings review_listing on review_listing.id = review.listing_id
    left join users review_user on review_user.id = review.user_id
    left join listing_media photo
      on mq.type = 'photo' and photo.id = mq.reference_id
    left join listings photo_listing on photo_listing.id = photo.listing_id
    left join review_media review_photo
      on mq.type = 'photo' and review_photo.id = mq.reference_id
    left join reviews review_photo_review
      on review_photo_review.id = review_photo.review_id
    left join listings review_photo_listing
      on review_photo_listing.id = review_photo_review.listing_id
    left join route_contributions contribution
      on mq.type = 'route_contribution' and contribution.id = mq.reference_id
    left join users contribution_user on contribution_user.id = contribution.user_id
    left join listings moderation_listing
      on mq.type in ('listing_report', 'listing_edit')
      and moderation_listing.id = mq.reference_id
    left join businesses moderation_business
      on moderation_business.id = moderation_listing.business_id
    where mq.status = ${query.status}::moderation_status
      and (${query.type ?? null}::text is null or mq.type = ${query.type ?? null}::moderation_type)
    order by mq.created_at asc
    limit ${query.limit}
    offset ${query.offset}
  `);

  return result.rows.map((row) => ({
    ...row,
    details: normalizeModerationDetails(row.details),
  }));
}

export async function resolveModerationItem(
  queueId: string,
  input: unknown,
  actorId: string,
) {
  const parsedQueueId = z.string().uuid().parse(queueId);
  const parsed = moderationResolutionSchema.parse(input);

  return db.transaction(async (tx) => {
    const queueResult = await tx.execute<{
      queueId: string;
      type: ModerationType;
      referenceId: string;
      status: string;
      payload: unknown;
    }>(sql`
      select id::text as "queueId",
             type,
             reference_id::text as "referenceId",
             status,
             payload
      from moderation_queue
      where id = ${parsedQueueId}::uuid
      for update
    `);
    const queue = queueResult.rows[0];
    if (!queue) throw new AdminDomainError("Moderation item not found.", 404);
    if (queue.status !== "pending") {
      throw new AdminDomainError(
        "Moderation item has already been resolved.",
        409,
      );
    }

    if (queue.type === "claim") {
      await resolveClaim(
        tx,
        queue.referenceId,
        parsed.decision,
        parsed.notes,
        actorId,
      );
    } else if (queue.type === "review") {
      await resolveReview(tx, queue.referenceId, parsed.decision);
    } else if (queue.type === "photo") {
      await resolvePhoto(tx, queue.referenceId, parsed.decision);
    } else if (queue.type === "route_contribution") {
      await resolveRouteContribution(
        tx,
        queue.referenceId,
        parsed.decision,
        actorId,
      );
    } else if (
      queue.type === "listing_report" ||
      queue.type === "listing_edit"
    ) {
      await resolveListingModeration(
        tx,
        queue.referenceId,
        queue.type,
        parsed,
        queue.payload,
        actorId,
      );
    } else {
      await assertListingExists(tx, queue.referenceId);
    }

    await tx.execute(sql`
      update moderation_queue
      set status = ${parsed.decision === "approve" ? "approved" : "rejected"}::moderation_status,
          reviewer_id = ${actorId}::uuid,
          reviewer_notes = ${parsed.notes || null},
          resolved_at = now()
      where id = ${parsedQueueId}::uuid
    `);

    await writeAudit(tx, {
      actorId,
      action: `admin.moderation.${parsed.decision}`,
      entityType: queue.type === "claim" ? "claim_request" : queue.type,
      entityId: queue.referenceId,
      changes: {
        queueId: parsedQueueId,
        decision: parsed.decision,
        notes: parsed.notes || null,
      },
    });

    return {
      queueId: parsedQueueId,
      type: queue.type,
      referenceId: queue.referenceId,
      status: parsed.decision === "approve" ? "approved" : "rejected",
      reviewerId: actorId,
      reviewerNotes: parsed.notes || null,
    } as const;
  });
}

export async function listAdminListings(input: unknown = {}) {
  const query = adminListingsQuerySchema.parse(input);
  const result = await db.execute<AdminListing>(sql`
    select
      l.id::text as "id",
      l.slug,
      l.name,
      l.category,
      l.description,
      l.status,
      l.business_id::text as "businessId",
      b.display_name as "businessName",
      l.claim_status as "claimStatus",
      l.address,
      l.price_min as "priceMin",
      l.price_max as "priceMax",
      l.booking_mode as "bookingMode",
      l.contact_phone as "contactPhone",
      l.contact_facebook as "contactFacebook",
      l.contact_website as "contactWebsite",
      (select count(*)::integer from listing_media lm where lm.listing_id = l.id) as "mediaCount",
      (select count(*)::integer from bookings bk where bk.listing_id = l.id) as "bookingCount",
      l.published_at as "publishedAt",
      l.updated_at as "updatedAt"
    from listings l
    left join businesses b on b.id = l.business_id
    where l.status = ${query.status}::listing_status
      and (${query.q ?? null}::text is null or l.name ilike ${query.q ? `%${query.q}%` : null})
    order by l.updated_at desc
    limit ${query.limit}
    offset ${query.offset}
  `);
  return result.rows;
}

export async function updateAdminListing(
  listingId: string,
  input: unknown,
  actorId: string,
) {
  const parsedListingId = z.string().uuid().parse(listingId);
  const parsed = adminListingUpdateSchema.parse(input);
  const status =
    parsed.status ??
    (parsed.action
      ? parsed.action === "publish"
        ? "published"
        : "draft"
      : parsed.published === undefined
        ? null
        : parsed.published
          ? "published"
          : "draft");

  return db.transaction(async (tx) => {
    if (status === "published") {
      const issues = await getListingPublishIssues(parsedListingId, tx);
      if (issues.length) {
        throw new AdminDomainError(
          `Cannot publish until: ${issues.join(" ")}`,
          409,
        );
      }
    }
    const listing = await updateListingRecord(
      tx,
      parsedListingId,
      parsed,
      status,
    );
    if (!listing) throw new AdminDomainError("Listing not found.", 404);

    const action =
      status === "published"
        ? "admin.listing.publish"
        : status !== null && status !== undefined
          ? "admin.listing.unpublish"
          : "admin.listing.update";
    await writeAudit(tx, {
      actorId,
      action,
      entityType: "listing",
      entityId: parsedListingId,
      changes: parsed,
    });
    return listing;
  });
}

export type DataQualityItem = {
  id: string;
  name: string;
  category: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  locationTrust: string;
  address: Record<string, unknown> | null;
  canonicalAreaName: string | null;
  primaryRateComplete: boolean;
  hoursComplete: boolean;
  provenanceComplete: boolean;
  primaryRateId: string | null;
  nearestStopM: number | null;
  routeFreshness: "fresh" | "stale" | "unknown";
};

export async function getDataQualityItems(): Promise<DataQualityItem[]> {
  const result = await db.execute<DataQualityItem>(sql`
    select l.id::text as id, l.name, l.category, l.status, l.address,
      case when l.location is null then null else ST_Y(l.location::geometry) end as latitude,
      case when l.location is null then null else ST_X(l.location::geometry) end as longitude,
      l.location_verification_status as "locationTrust", a.name as "canonicalAreaName",
      (select rp.id::text from rate_plans rp where rp.listing_id = l.id and rp.active order by rp.is_primary desc, rp.sort_order, rp.id limit 1) as "primaryRateId",
      exists(select 1 from rate_plans rp where rp.listing_id = l.id and rp.active and rp.is_primary
        and rp.billing_period is not null and rp.billing_unit is not null and rp.capacity_per_unit > 0
        and rp.available_quantity is not null and rp.max_pax is not null) as "primaryRateComplete",
      exists(select 1 from listing_opening_hours h where h.listing_id = l.id) as "hoursComplete",
      exists(select 1 from listing_field_provenance fp where fp.listing_id = l.id and fp.is_canonical) as "provenanceComplete",
      (select round(ST_Distance(l.location, rs.location))::integer from route_stops rs where l.location is not null order by l.location <-> rs.location limit 1) as "nearestStopM",
      case when not exists(select 1 from transport_routes tr where tr.status = 'published'::transport_status) then 'unknown'
           when exists(select 1 from transport_routes tr where tr.status = 'published'::transport_status and tr.last_verified_at >= now() - interval '30 days') then 'fresh'
           else 'stale' end as "routeFreshness"
    from listings l left join areas a on a.id = l.canonical_area_id
    order by l.updated_at desc, l.name
  `);
  return result.rows;
}

export async function listAdminAreas() {
  const result = await db.execute<{
    id: string;
    name: string;
    type: string;
  }>(sql`
    select id::text as id, name, type from areas order by type, name
  `);
  return result.rows;
}

export type DuplicateCandidate = {
  sourceId: string;
  sourceName: string;
  candidateId: string;
  candidateName: string;
  nameSimilarity: number;
  distanceM: number;
  lastDecision: "not_duplicate" | "needs_merge_review" | null;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  reviewerName: string | null;
};

export async function getDuplicateCandidates(): Promise<DuplicateCandidate[]> {
  const result = await db.execute<DuplicateCandidate>(sql`
    select a.id::text as "sourceId", a.name as "sourceName", b.id::text as "candidateId", b.name as "candidateName",
      round(similarity(a.name, b.name)::numeric, 2)::float as "nameSimilarity",
      round(ST_Distance(a.location, b.location))::integer as "distanceM",
      duplicate_review.decision as "lastDecision",
      duplicate_review.notes as "reviewNotes",
      duplicate_review."reviewedAt" as "reviewedAt",
      duplicate_review."reviewerName" as "reviewerName"
    from listings a join listings b on a.id < b.id
    left join lateral (
      select al.changes ->> 'decision' as decision,
        al.changes ->> 'notes' as notes,
        al.created_at as "reviewedAt",
        u.name as "reviewerName"
      from audit_log al
      left join users u on u.id = al.actor_id
      where al.entity_type = 'listing'
        and al.entity_id = a.id
        and al.action = 'admin.data_quality.duplicate_review'
        and al.changes ->> 'candidateListingId' = b.id::text
      order by al.created_at desc
      limit 1
    ) duplicate_review on true
    where a.location is not null and b.location is not null
      and ST_DWithin(a.location, b.location, 1500)
      and similarity(a.name, b.name) >= 0.35
    order by similarity(a.name, b.name) desc, ST_Distance(a.location, b.location) asc
    limit 100
  `);
  return result.rows;
}

export type DataQualityAudit = {
  id: string;
  action: string;
  actorName: string | null;
  changes: Record<string, unknown>;
  createdAt: Date;
};

export async function getDataQualityAudits(
  listingId: string,
): Promise<DataQualityAudit[]> {
  const parsedListingId = z.string().uuid().parse(listingId);
  const result = await db.execute<DataQualityAudit>(sql`
    select al.id::text as id, al.action, u.name as "actorName", al.changes, al.created_at as "createdAt"
    from audit_log al left join users u on u.id = al.actor_id
    where al.entity_type = 'listing' and al.entity_id = ${parsedListingId}::uuid
      and (al.action like 'admin.data_quality.%' or al.action = 'listing.owner_update')
    order by al.created_at desc limit 30
  `);
  return result.rows;
}

export async function repairAdminLocation(
  listingId: string,
  input: unknown,
  actorId: string,
) {
  const parsedListingId = z.string().uuid().parse(listingId);
  const parsed = adminLocationRepairSchema.parse(input);
  return db.transaction(async (tx) => {
    const before = await tx.execute<{
      location: unknown;
      address: Record<string, unknown> | null;
      canonicalAreaId: string | null;
    }>(sql`
      select case when location is null then null else json_build_object('latitude', ST_Y(location::geometry), 'longitude', ST_X(location::geometry)) end as location,
        address, canonical_area_id::text as "canonicalAreaId"
      from listings where id = ${parsedListingId}::uuid for update
    `);
    if (!before.rows[0]) throw new AdminDomainError("Listing not found.", 404);
    if (parsed.canonicalAreaId) {
      const area = await tx.execute(
        sql`select 1 from areas where id = ${parsed.canonicalAreaId}::uuid`,
      );
      if (!area.rows[0])
        throw new AdminDomainError("Canonical area not found.", 404);
    }
    await tx.execute(sql`
      update listings set location = ST_SetSRID(ST_MakePoint(${parsed.longitude}, ${parsed.latitude}), 4326)::geography,
        address = case
          when ${parsed.resolvedAddress ?? null}::text is null then address
          else jsonb_set(coalesce(address, '{}'::jsonb), '{displayName}', to_jsonb(${parsed.resolvedAddress ?? null}::text), true)
        end,
        canonical_area_id = coalesce(${parsed.canonicalAreaId ?? null}::uuid, canonical_area_id),
        location_source = 'team'::location_source, location_accuracy = 'exact'::location_accuracy,
        location_verification_status = 'team_verified'::listing_trust_status,
        location_last_verified_at = now(), location_verified_by = ${actorId}::uuid,
        location_override_reason = ${parsed.overrideReason?.trim() || null}, updated_at = now()
      where id = ${parsedListingId}::uuid
    `);
    await upsertAdminProvenance(
      tx,
      parsedListingId,
      "location",
      "team_verified",
      parsed.sourceNote,
      actorId,
      parsed.evidenceUrl,
    );
    await writeAudit(tx, {
      actorId,
      action: "admin.data_quality.location_repair",
      entityType: "listing",
      entityId: parsedListingId,
      changes: {
        before: before.rows[0],
        after: {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          canonicalAreaId:
            parsed.canonicalAreaId ?? before.rows[0].canonicalAreaId,
          resolvedAddress:
            parsed.resolvedAddress ??
            (typeof before.rows[0].address?.displayName === "string"
              ? before.rows[0].address.displayName
              : null),
        },
        overrideReason: parsed.overrideReason ?? null,
        sourceNote: parsed.sourceNote,
        evidenceUrl: parsed.evidenceUrl,
      },
    });
  });
}

export async function assignAdminAreas(input: unknown, actorId: string) {
  const parsed = adminAreaAssignmentSchema.parse(input);
  return db.transaction(async (tx) => {
    const area = await tx.execute<{ name: string }>(
      sql`select name from areas where id = ${parsed.canonicalAreaId}::uuid`,
    );
    if (!area.rows[0])
      throw new AdminDomainError("Canonical area not found.", 404);
    const requestedListingIds = new Set(parsed.listingIds);
    const listings = await tx.execute<{ id: string }>(sql`
      select id::text as id from listings
      where id in (${sql.join(
        Array.from(requestedListingIds).map(
          (listingId) => sql`${listingId}::uuid`,
        ),
        sql`, `,
      )})
      for update
    `);
    if (listings.rows.length !== requestedListingIds.size) {
      throw new AdminDomainError(
        "One or more listings selected for area assignment were not found.",
        404,
      );
    }
    for (const listingId of parsed.listingIds) {
      await tx.execute(
        sql`update listings set canonical_area_id = ${parsed.canonicalAreaId}::uuid, updated_at = now() where id = ${listingId}::uuid`,
      );
      await writeAudit(tx, {
        actorId,
        action: "admin.data_quality.area_assign",
        entityType: "listing",
        entityId: listingId,
        changes: {
          canonicalAreaId: parsed.canonicalAreaId,
          canonicalAreaName: area.rows[0].name,
          notes: parsed.notes,
        },
      });
    }
  });
}

export async function repairAdminPrimaryRate(
  listingId: string,
  input: unknown,
  actorId: string,
) {
  const parsedListingId = z.string().uuid().parse(listingId);
  const parsed = adminPrimaryRateRepairSchema.parse(input);
  return db.transaction(async (tx) => {
    const rate = await tx.execute<{ id: string }>(
      sql`select id::text as id from rate_plans where id = ${parsed.rateId}::uuid and listing_id = ${parsedListingId}::uuid for update`,
    );
    if (!rate.rows[0])
      throw new AdminDomainError("Rate does not belong to this listing.", 404);
    if (parsed.makePrimary)
      await tx.execute(
        sql`update rate_plans set is_primary = false where listing_id = ${parsedListingId}::uuid and active`,
      );
    await tx.execute(
      sql`update rate_plans set active = ${parsed.active}, is_primary = ${parsed.makePrimary && parsed.active} where id = ${parsed.rateId}::uuid`,
    );
    await upsertAdminProvenance(
      tx,
      parsedListingId,
      "rate",
      "team_verified",
      parsed.notes,
      actorId,
      parsed.evidenceUrl,
    );
    await upsertAdminProvenance(
      tx,
      parsedListingId,
      "capacity",
      "team_verified",
      parsed.notes,
      actorId,
      parsed.evidenceUrl,
    );
    await writeAudit(tx, {
      actorId,
      action: "admin.data_quality.primary_rate_repair",
      entityType: "listing",
      entityId: parsedListingId,
      changes: {
        rateId: parsed.rateId,
        makePrimary: parsed.makePrimary,
        active: parsed.active,
        notes: parsed.notes,
        evidenceUrl: parsed.evidenceUrl,
      },
    });
  });
}

export async function repairAdminProvenance(
  listingId: string,
  input: unknown,
  actorId: string,
) {
  const parsedListingId = z.string().uuid().parse(listingId);
  const parsed = adminProvenanceRepairSchema.parse(input);
  return db.transaction(async (tx) => {
    await upsertAdminProvenance(
      tx,
      parsedListingId,
      parsed.fieldName,
      parsed.trustStatus,
      parsed.sourceNote,
      actorId,
      parsed.evidenceUrl,
    );
    await writeAudit(tx, {
      actorId,
      action: "admin.data_quality.provenance_repair",
      entityType: "listing",
      entityId: parsedListingId,
      changes: parsed,
    });
  });
}

export async function recordAdminDuplicateReview(
  input: unknown,
  actorId: string,
) {
  const parsed = adminDuplicateReviewSchema.parse(input);
  if (parsed.sourceListingId === parsed.candidateListingId) {
    throw new AdminDomainError("A listing cannot be reviewed against itself.");
  }
  return db.transaction(async (tx) => {
    const listings = await tx.execute<{ id: string }>(sql`
      select id::text as id from listings where id in (${parsed.sourceListingId}::uuid, ${parsed.candidateListingId}::uuid) for update
    `);
    if (listings.rows.length !== 2)
      throw new AdminDomainError(
        "Duplicate candidate listing was not found.",
        404,
      );
    await writeAudit(tx, {
      actorId,
      action: "admin.data_quality.duplicate_review",
      entityType: "listing",
      entityId: parsed.sourceListingId,
      changes: {
        candidateListingId: parsed.candidateListingId,
        decision: parsed.decision,
        notes: parsed.notes,
      },
    });
  });
}

async function getListingPublishIssues(
  listingId: string,
  executor: Pick<typeof db, "execute"> = db,
) {
  const result = await executor.execute<{
    latitude: number | null;
    longitude: number | null;
    locationOverrideReason: string | null;
    usableRate: boolean;
  }>(sql`
    select case when l.location is null then null else ST_Y(l.location::geometry) end as latitude,
      case when l.location is null then null else ST_X(l.location::geometry) end as longitude,
      l.location_override_reason as "locationOverrideReason",
      exists(select 1 from rate_plans rp where rp.listing_id = l.id and rp.active and rp.is_primary
        and rp.price >= 0 and rp.billing_period is not null and rp.billing_unit is not null
        and rp.capacity_per_unit > 0 and rp.available_quantity is not null
        and rp.min_pax <= rp.max_pax and rp.included_pax between rp.min_pax and rp.max_pax) as "usableRate"
    from listings l where l.id = ${listingId}::uuid
  `);
  const listing = result.rows[0];
  if (!listing) throw new AdminDomainError("Listing not found.", 404);
  const issues: string[] = [];
  if (
    listing.latitude === null ||
    listing.longitude === null ||
    listing.latitude < 6.9 ||
    listing.latitude > 7.566667 ||
    listing.longitude < 125.233333 ||
    listing.longitude > 125.791111
  ) {
    if (!listing.locationOverrideReason)
      issues.push(
        "set a valid Samal/Davao City coordinate or record an approved override.",
      );
  }
  if (!listing.usableRate)
    issues.push(
      "add one usable primary rate with billing, capacity, guest, and quantity data.",
    );
  return issues;
}

async function upsertAdminProvenance(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  listingId: string,
  fieldName: string,
  trustStatus:
    "owner_provided" | "team_verified" | "estimated" | "stale" | "unknown",
  sourceNote: string,
  actorId: string,
  evidenceUrl?: string,
) {
  const source = await tx.execute<{ id: string }>(sql`
    insert into listing_sources (listing_id, provider, source_url, rights_classification, retention_classification, last_checked_at, last_verified_at)
    values (${listingId}::uuid, 'admin_data_quality', ${evidenceUrl ?? null}, 'team_collected'::source_rights_classification, 'retain'::source_retention_classification, now(), case when ${trustStatus} = 'team_verified' then now() else null end)
    returning id::text as id
  `);
  const sourceId = source.rows[0]?.id;
  if (!sourceId)
    throw new AdminDomainError("Data source could not be recorded.");
  await tx.execute(
    sql`update listing_field_provenance set is_canonical = false, updated_at = now() where listing_id = ${listingId}::uuid and field_name = ${fieldName} and is_canonical`,
  );
  await tx.execute(sql`
    insert into listing_field_provenance (listing_id, field_name, source_id, trust_status, is_canonical, verified_by, checked_at, source_note)
    values (${listingId}::uuid, ${fieldName}, ${sourceId}::uuid, ${trustStatus}::listing_trust_status, true, ${actorId}::uuid, now(), ${sourceNote})
  `);
}

export async function createAdminListing(input: unknown, actorId: string) {
  const parsed = adminListingCreateSchema.parse(input);
  const slug = parsed.slug ?? slugify(parsed.name);

  return db.transaction(async (tx) => {
    const existing = await tx.execute(sql`
      select 1 from listings where slug = ${slug} limit 1
    `);
    if (existing.rows[0]) {
      throw new AdminDomainError(
        "A listing with this slug already exists.",
        409,
      );
    }

    const locationSql =
      parsed.latitude !== undefined && parsed.longitude !== undefined
        ? sql`ST_SetSRID(ST_MakePoint(${parsed.longitude}, ${parsed.latitude}), 4326)::geography`
        : sql`null`;

    const result = await tx.execute<AdminListing>(sql`
      insert into listings (
        slug, name, category, description, status, claim_status,
        location, address, attributes, price_min, price_max,
        booking_mode, cancellation_policy, downpayment_pct,
        contact_phone, contact_facebook, contact_website, published_at
      )
      values (
        ${slug},
        ${parsed.name},
        ${parsed.category}::listing_category,
        ${parsed.description ?? null},
        ${parsed.status}::listing_status,
        'unclaimed'::claim_status,
        ${locationSql},
        ${JSON.stringify(parsed.address ?? {})}::jsonb,
        ${JSON.stringify(parsed.attributes ?? {})}::jsonb,
        ${parsed.priceMin ?? null},
        ${parsed.priceMax ?? null},
        ${parsed.bookingMode ?? "inquiry"}::booking_mode,
        ${parsed.cancellationPolicy ?? "flexible"}::cancellation_policy,
        ${parsed.downpaymentPct ?? 50},
        ${parsed.contactPhone ?? null},
        ${parsed.contactFacebook ?? null},
        ${parsed.contactWebsite ?? null},
        ${parsed.status === "published" ? sql`now()` : sql`null`}
      )
      returning
        id::text as "id", slug, name, category, description, status,
        business_id::text as "businessId", null::text as "businessName",
        claim_status as "claimStatus", address, price_min as "priceMin",
        price_max as "priceMax", booking_mode as "bookingMode",
        contact_phone as "contactPhone", contact_facebook as "contactFacebook",
        contact_website as "contactWebsite", 0::integer as "mediaCount",
        0::integer as "bookingCount", published_at as "publishedAt",
        updated_at as "updatedAt"
    `);
    const listing = result.rows[0];
    if (!listing) throw new AdminDomainError("Listing could not be created.");

    await writeAudit(tx, {
      actorId,
      action: "admin.listing.create",
      entityType: "listing",
      entityId: listing.id,
      changes: parsed,
    });
    return listing;
  });
}

export async function mergeAdminListings(input: unknown, actorId: string) {
  const parsed = adminListingMergeSchema.parse(input);
  if (parsed.sourceListingId === parsed.targetListingId) {
    throw new AdminDomainError("Source and target listings must differ.");
  }

  return db.transaction(async (tx) => {
    const listings = await tx.execute<{
      id: string;
      name: string;
      status: string;
    }>(sql`
      select id::text as id, name, status
      from listings
      where id in (${parsed.sourceListingId}::uuid, ${parsed.targetListingId}::uuid)
      for update
    `);
    const source = listings.rows.find(
      (row) => row.id === parsed.sourceListingId,
    );
    const target = listings.rows.find(
      (row) => row.id === parsed.targetListingId,
    );
    if (!source || !target) {
      throw new AdminDomainError(
        "Source or target listing was not found.",
        404,
      );
    }

    await tx.execute(sql`
      update bookings set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update reviews set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update listing_media set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update listing_amenities set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
        and amenity_id not in (
          select amenity_id from listing_amenities
          where listing_id = ${parsed.targetListingId}::uuid
        )
    `);
    await tx.execute(sql`
      delete from listing_amenities
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update rate_plans set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      delete from availability_blocks source
      using availability_blocks target
      where source.listing_id = ${parsed.sourceListingId}::uuid
        and target.listing_id = ${parsed.targetListingId}::uuid
        and source.date = target.date
        and source.rate_plan_id is not distinct from target.rate_plan_id
    `);
    await tx.execute(sql`
      update availability_blocks set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update crowd_reports set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update questions set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);
    await tx.execute(sql`
      update claim_requests set listing_id = ${parsed.targetListingId}::uuid
      where listing_id = ${parsed.sourceListingId}::uuid
    `);

    if (parsed.archiveSource) {
      await tx.execute(sql`
        update listings
        set status = 'archived'::listing_status,
            published_at = null,
            attributes = attributes || ${JSON.stringify({
              mergedInto: parsed.targetListingId,
              mergeNotes: parsed.notes,
            })}::jsonb,
            updated_at = now()
        where id = ${parsed.sourceListingId}::uuid
      `);
    }

    await writeAudit(tx, {
      actorId,
      action: "admin.listing.merge",
      entityType: "listing",
      entityId: parsed.targetListingId,
      changes: {
        sourceListingId: parsed.sourceListingId,
        targetListingId: parsed.targetListingId,
        sourceName: source.name,
        targetName: target.name,
        notes: parsed.notes,
        archiveSource: parsed.archiveSource,
      },
    });

    return {
      sourceListingId: parsed.sourceListingId,
      targetListingId: parsed.targetListingId,
      archivedSource: parsed.archiveSource,
      notes: parsed.notes,
    };
  });
}

export async function adminManageBooking(
  bookingId: string,
  input: unknown,
  actorId: string,
) {
  const parsedBookingId = z.string().uuid().parse(bookingId);
  const parsed = adminBookingActionSchema.parse(input);
  const at = new Date();

  if (parsed.action === "dispute_note") {
    await db.execute(sql`
      insert into audit_log (actor_id, action, entity_type, entity_id, changes)
      values (
        ${actorId}::uuid,
        'admin.booking.dispute_note',
        'booking',
        ${parsedBookingId}::uuid,
        ${JSON.stringify({
          reason: parsed.reason,
          note: parsed.note ?? parsed.reason,
        })}::jsonb
      )
    `);
    return {
      bookingId: parsedBookingId,
      action: "dispute_note" as const,
      note: parsed.note ?? parsed.reason,
    };
  }

  const booking = await db.execute<{
    id: string;
    status: BookingStatus;
    checkIn: string;
    policy: "flexible" | "moderate" | "strict";
    downpaymentAmount: number;
    paymentId: string | null;
    paymentAmount: number | null;
    paymentStatus: string | null;
    refundAmount: number | null;
  }>(sql`
    select
      b.id::text as id,
      b.status,
      b.check_in::text as "checkIn",
      l.cancellation_policy as policy,
      b.downpayment_amount as "downpaymentAmount",
      p.id::text as "paymentId",
      p.amount as "paymentAmount",
      p.status as "paymentStatus",
      p.refund_amount as "refundAmount"
    from bookings b
    join listings l on l.id = b.listing_id
    left join payments p on p.booking_id = b.id
    where b.id = ${parsedBookingId}::uuid
    limit 1
  `);
  const row = booking.rows[0];
  if (!row) throw new AdminDomainError("Booking not found.", 404);

  if (parsed.action === "cancel") {
    const cancelTarget: BookingStatus =
      row.status === "requested" ||
      row.status === "awaiting_payment" ||
      row.status === "confirmed" ||
      row.status === "accepted"
        ? "cancelled_by_owner"
        : row.status;

    if (cancelTarget !== row.status) {
      await db.transaction(async (tx) => {
        await transitionBookingStatus(tx, {
          bookingId: row.id,
          from: row.status,
          to: cancelTarget,
          reason: parsed.reason,
          at,
        });
        await writeAudit(tx, {
          actorId,
          action: "admin.booking.cancel",
          entityType: "booking",
          entityId: row.id,
          changes: {
            from: row.status,
            to: cancelTarget,
            reason: parsed.reason,
          },
        });
      });
    }

    let refundRequest = null;
    if (
      row.paymentId &&
      (row.paymentStatus === "paid" ||
        row.paymentStatus === "partially_refunded")
    ) {
      const calculation = calculateRefund({
        policy: row.policy,
        amountPaid: row.paymentAmount ?? row.downpaymentAmount,
        checkIn: row.checkIn,
        at,
      });
      const amount = parsed.refundAmount ?? calculation.refundAmount;
      if (amount > 0) {
        refundRequest = await requestPaymongoRefund({
          bookingId: row.id,
          amount,
          reason: parsed.reason,
        });
        await db.execute(sql`
          insert into audit_log (actor_id, action, entity_type, entity_id, changes)
          values (
            ${actorId}::uuid,
            'admin.booking.refund_requested',
            'booking',
            ${row.id}::uuid,
            ${JSON.stringify({
              amount,
              reason: parsed.reason,
              refundRequest,
            })}::jsonb
          )
        `);
      }
    }

    return {
      bookingId: row.id,
      action: "cancel" as const,
      status: cancelTarget,
      refundRequest,
    };
  }

  // refund — provider webhook remains authoritative for payment/booking refunded state
  if (
    !row.paymentId ||
    (row.paymentStatus !== "paid" && row.paymentStatus !== "partially_refunded")
  ) {
    throw new AdminDomainError(
      "Only paid bookings can be refunded by an admin.",
      409,
    );
  }

  const remaining =
    Number(row.paymentAmount ?? 0) - Number(row.refundAmount ?? 0);
  const amount = parsed.refundAmount ?? remaining;
  if (amount <= 0 || amount > remaining) {
    throw new AdminDomainError("Refund amount exceeds the remaining balance.");
  }

  const refundRequest = await requestPaymongoRefund({
    bookingId: row.id,
    amount,
    reason: parsed.reason,
  });

  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${actorId}::uuid,
      'admin.booking.refund',
      'booking',
      ${row.id}::uuid,
      ${JSON.stringify({
        amount,
        reason: parsed.reason,
        refundRequest,
        bookingStatus: row.status,
      })}::jsonb
    )
  `);

  return {
    bookingId: row.id,
    action: "refund" as const,
    refundRequest,
  };
}

export async function listBookingOversight(input: unknown = {}) {
  const query = adminBookingListQuerySchema.parse(input);
  const result = await db.execute<BookingOversightRow>(sql`
    select
      bk.id::text as "id",
      bk.listing_id::text as "listingId",
      l.name as "listingName",
      l.business_id::text as "businessId",
      b.display_name as "businessName",
      bk.guest_name as "guestName",
      bk.guest_email as "guestEmail",
      bk.status,
      bk.check_in::text as "checkIn",
      bk.check_out::text as "checkOut",
      bk.pax,
      bk.subtotal,
      bk.downpayment_amount as "downpaymentAmount",
      bk.balance_due as "balanceDue",
      bk.currency,
      p.status as "paymentStatus",
      p.amount as "paymentAmount",
      payout.status as "payoutStatus",
      (
        bk.status = 'completed'::booking_status
        and p.status = 'paid'::payment_status
        and payout.id is null
      ) as "payoutEligible",
      case
        when bk.status <> 'completed'::booking_status then 'Booking is not completed.'
        when p.id is null then 'No payment record.'
        when p.status <> 'paid'::payment_status then 'Payment is not paid.'
        when payout.id is not null then 'Booking is already in a payout.'
        else 'Eligible for payout.'
      end as "payoutEligibilityReason",
      bk.created_at as "createdAt"
    from bookings bk
    join listings l on l.id = bk.listing_id
    left join businesses b on b.id = l.business_id
    left join payments p on p.booking_id = bk.id
    left join lateral (
      select p2.id, p2.status
      from payouts p2
      where p2.booking_ids @> array[bk.id]::uuid[]
      order by p2.created_at desc
      limit 1
    ) payout on true
    where (${query.status ?? null}::text is null or bk.status::text = ${query.status ?? null})
    order by bk.created_at desc
    limit ${query.limit}
    offset ${query.offset}
  `);
  return result.rows;
}

export async function getPayoutEligibilitySummary(): Promise<PayoutEligibilitySummary> {
  const result = await db.execute<PayoutEligibilitySummary>(sql`
    select
      count(*) filter (
        where bk.status = 'completed'::booking_status
          and p.status = 'paid'::payment_status
          and not exists (
            select 1 from payouts p2
            where p2.booking_ids @> array[bk.id]::uuid[]
              and p2.status in ('pending'::payout_status, 'completed'::payout_status)
          )
      )::integer as "eligibleBookingCount",
      coalesce(sum(p.amount) filter (
        where bk.status = 'completed'::booking_status
          and p.status = 'paid'::payment_status
          and not exists (
            select 1 from payouts p2
            where p2.booking_ids @> array[bk.id]::uuid[]
              and p2.status in ('pending'::payout_status, 'completed'::payout_status)
          )
      ), 0)::integer as "eligibleAmount",
      count(*) filter (where bk.status = 'completed'::booking_status and p.status = 'paid'::payment_status)::integer as "completedPaidBookingCount",
      coalesce(sum(p.amount) filter (where bk.status = 'completed'::booking_status and p.status = 'paid'::payment_status), 0)::integer as "completedPaidAmount",
      count(*) filter (where exists (
        select 1 from payouts p2
        where p2.booking_ids @> array[bk.id]::uuid[]
          and p2.status in ('pending'::payout_status, 'completed'::payout_status)
      ))::integer as "alreadyPayoutBookingCount",
      count(*) filter (where p.id is null or p.status <> 'paid'::payment_status)::integer as "pendingPaymentBookingCount"
    from bookings bk
    left join payments p on p.booking_id = bk.id
  `);
  return (
    result.rows[0] ?? {
      eligibleBookingCount: 0,
      eligibleAmount: 0,
      completedPaidBookingCount: 0,
      completedPaidAmount: 0,
      alreadyPayoutBookingCount: 0,
      pendingPaymentBookingCount: 0,
    }
  );
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [counts, queue] = await Promise.all([
    db.execute<Omit<AdminMetrics, "queueByType">>(sql`
      select
        (select count(*)::integer from listings) as "totalListings",
        (select count(*)::integer from listings where status = 'published'::listing_status) as "publishedListings",
        (select count(*)::integer from moderation_queue where status = 'pending'::moderation_status) as "pendingModeration",
        (select count(*)::integer from moderation_queue where type = 'claim'::moderation_type and status = 'pending'::moderation_status) as "pendingClaims",
        (select count(*)::integer from moderation_queue where type = 'route_contribution'::moderation_type and status = 'pending'::moderation_status) as "pendingRouteContributions",
        (select count(*)::integer from moderation_queue where type = 'listing_report'::moderation_type and status = 'pending'::moderation_status) as "pendingListingReports",
        (select count(*)::integer from bookings) as "bookingsTotal",
        (select count(*)::integer from bookings where created_at >= date_trunc('month', now())) as "bookingsThisMonth",
        (select count(*)::integer from bookings where status = 'completed'::booking_status) as "completedBookings",
        (select coalesce(sum(amount), 0)::integer from payments where status = 'paid'::payment_status) as "paidGmv",
        (select coalesce(sum(p.amount), 0)::integer
         from bookings bk join payments p on p.booking_id = bk.id
         where bk.status = 'completed'::booking_status and p.status = 'paid'::payment_status
           and not exists (
             select 1 from payouts p2
             where p2.booking_ids @> array[bk.id]::uuid[]
               and p2.status in ('pending'::payout_status, 'completed'::payout_status)
           )) as "payoutEligibleAmount"
    `),
    db.execute<{ type: ModerationType; count: number }>(sql`
      select type, count(*)::integer as count
      from moderation_queue
      where status = 'pending'::moderation_status
      group by type
    `),
  ]);
  const base = counts.rows[0] ?? {
    totalListings: 0,
    publishedListings: 0,
    pendingModeration: 0,
    pendingClaims: 0,
    pendingRouteContributions: 0,
    pendingListingReports: 0,
    bookingsTotal: 0,
    bookingsThisMonth: 0,
    completedBookings: 0,
    paidGmv: 0,
    payoutEligibleAmount: 0,
  };
  const queueByType = Object.fromEntries(
    [
      "claim",
      "review",
      "photo",
      "route_contribution",
      "listing_report",
      "listing_edit",
    ].map((type) => [type, 0]),
  ) as Record<ModerationType, number>;
  for (const row of queue.rows) queueByType[row.type] = row.count;
  return { ...base, queueByType };
}

export async function listAdminRoutes(): Promise<AdminRoute[]> {
  const result = await db.execute<AdminRoute>(sql`
    select tr.id::text as id, tr.name, tr.mode, tr.status, tr.source,
      (select count(*)::integer from route_stops rs where rs.route_id = tr.id) as "stopCount",
      tr.updated_at as "updatedAt"
    from transport_routes tr
    order by tr.updated_at desc, tr.name asc
    limit 100
  `);
  return result.rows;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const result = await db.execute<AdminUser>(sql`
    select id::text as id, name, email, role, created_at as "createdAt"
    from users
    order by created_at desc
    limit 100
  `);
  return result.rows;
}

async function resolveClaim(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  claimId: string,
  decision: "approve" | "reject",
  notes: string,
  actorId: string,
) {
  const result = await tx.execute<{
    listingId: string;
    listingName: string;
    listingBusinessId: string | null;
    claimantId: string;
    status: string;
    verificationData: unknown;
  }>(sql`
    select cr.listing_id::text as "listingId", l.name as "listingName",
           l.business_id::text as "listingBusinessId", cr.user_id::text as "claimantId",
           cr.status, cr.verification_data as "verificationData"
    from claim_requests cr
    join listings l on l.id = cr.listing_id
    where cr.id = ${claimId}::uuid
    for update of cr, l
  `);
  const claim = result.rows[0];
  if (!claim) throw new AdminDomainError("Claim request not found.", 404);
  if (!["pending", "disputed"].includes(claim.status)) {
    throw new AdminDomainError("Claim request has already been reviewed.", 409);
  }

  if (decision === "approve") {
    const data = asRecord(claim.verificationData);
    const business = await tx.execute<{ id: string }>(sql`
      insert into businesses (owner_id, display_name, contact_email, contact_phone, verified_at)
      values (
        ${claim.claimantId}::uuid,
        ${claim.listingName},
        ${stringOrNull(data.contactEmail)},
        ${stringOrNull(data.contactPhone)},
        now()
      )
      returning id::text as id
    `);
    const businessId = business.rows[0]?.id;
    if (!businessId)
      throw new AdminDomainError("Business ownership could not be assigned.");
    await tx.execute(sql`
      update listings
      set business_id = ${businessId}::uuid, claim_status = 'claimed'::claim_status, updated_at = now()
      where id = ${claim.listingId}::uuid
    `);
  } else {
    await tx.execute(sql`
      update listings
      set claim_status = ${claim.status === "disputed" ? "claimed" : "unclaimed"}::claim_status,
          updated_at = now()
      where id = ${claim.listingId}::uuid
    `);
  }

  await tx.execute(sql`
    update claim_requests
    set status = ${decision === "approve" ? "approved" : "rejected"}::claim_request_status,
        reviewed_by = ${actorId}::uuid, reviewed_at = now(), admin_notes = ${notes || null}
    where id = ${claimId}::uuid
  `);
}

async function resolveReview(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  reviewId: string,
  decision: "approve" | "reject",
) {
  const result = await tx.execute<{ listingId: string }>(sql`
    update reviews
    set status = ${decision === "approve" ? "published" : "removed"}::review_status
    where id = ${reviewId}::uuid
    returning listing_id::text as "listingId"
  `);
  const listingId = result.rows[0]?.listingId;
  if (!listingId) throw new AdminDomainError("Review not found.", 404);
  await tx.execute(sql`
    update listings l
    set rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from reviews r where r.listing_id = l.id and r.status = 'published'::review_status), 0),
        rating_count = (select count(*)::integer from reviews r where r.listing_id = l.id and r.status = 'published'::review_status),
        updated_at = now()
    where l.id = ${listingId}::uuid
  `);
}

async function resolvePhoto(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  mediaId: string,
  decision: "approve" | "reject",
) {
  if (decision === "approve") {
    const listingResult = await tx.execute(sql`
      update listing_media
      set moderated = true
      where id = ${mediaId}::uuid
    `);
    if ((listingResult.rowCount ?? 0) > 0) return;

    const reviewResult = await tx.execute(sql`
      update review_media
      set moderated = true
      where id = ${mediaId}::uuid
    `);
    if (reviewResult.rowCount === 0)
      throw new AdminDomainError("Photo not found.", 404);
    return;
  }
  const listingResult = await tx.execute(
    sql`delete from listing_media where id = ${mediaId}::uuid`,
  );
  if ((listingResult.rowCount ?? 0) > 0) return;

  const reviewResult = await tx.execute(
    sql`delete from review_media where id = ${mediaId}::uuid`,
  );
  if (reviewResult.rowCount === 0)
    throw new AdminDomainError("Photo not found.", 404);
}

async function resolveRouteContribution(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  contributionId: string,
  decision: "approve" | "reject",
  actorId: string,
) {
  const result = await tx.execute(sql`
    update route_contributions
    set status = ${decision === "approve" ? "approved" : "rejected"}::contribution_status,
        reviewed_by = ${actorId}::uuid
    where id = ${contributionId}::uuid and status = 'pending'::contribution_status
  `);
  if (result.rowCount === 0)
    throw new AdminDomainError(
      "Route contribution not found or already reviewed.",
      404,
    );
}

async function resolveListingModeration(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  listingId: string,
  type: "listing_report" | "listing_edit",
  resolution: z.output<typeof moderationResolutionSchema>,
  queuedPayload: unknown,
  actorId: string,
) {
  const parsedListingId = z.string().uuid().parse(listingId);
  const current = await tx.execute<{ status: string; name: string }>(sql`
    select status, name
    from listings
    where id = ${parsedListingId}::uuid
    for update
  `);
  const listing = current.rows[0];
  if (!listing) throw new AdminDomainError("Listing not found.", 404);

  if (resolution.decision === "reject") {
    return;
  }

  if (type === "listing_report") {
    const action = resolution.listingAction;
    if (!action || !["keep", "unpublish", "archive"].includes(action)) {
      throw new AdminDomainError(
        "Choose whether to keep, unpublish, or archive the reported listing.",
      );
    }

    if (action === "keep") {
      await writeAudit(tx, {
        actorId,
        action: "admin.listing.report.keep",
        entityType: "listing",
        entityId: parsedListingId,
        changes: {
          previousStatus: listing.status,
          nextStatus: listing.status,
          notes: resolution.notes,
        },
      });
      return;
    }

    const nextStatus = action === "archive" ? "archived" : "closed";
    await tx.execute(sql`
      update listings
      set status = ${nextStatus}::listing_status,
          published_at = null,
          updated_at = now()
      where id = ${parsedListingId}::uuid
    `);
    await writeAudit(tx, {
      actorId,
      action:
        action === "archive"
          ? "admin.listing.report.archive"
          : "admin.listing.report.unpublish",
      entityType: "listing",
      entityId: parsedListingId,
      changes: {
        previousStatus: listing.status,
        nextStatus,
        notes: resolution.notes,
      },
    });
    return;
  }

  if (resolution.listingAction && resolution.listingAction !== "edit") {
    throw new AdminDomainError(
      "A listing edit queue item can only apply an edit or be rejected.",
    );
  }
  const queuedChanges = asRecord(asRecord(queuedPayload).changes);
  const changes =
    resolution.listingChanges ??
    (Object.keys(queuedChanges).length > 0 ? queuedChanges : undefined);
  if (!changes) {
    throw new AdminDomainError(
      "This listing edit has no structured changes to apply.",
    );
  }
  const parsedChanges = adminListingEditChangesSchema.parse(changes);
  await updateListingRecord(tx, parsedListingId, parsedChanges, null);
  await writeAudit(tx, {
    actorId,
    action: "admin.listing.edit.apply",
    entityType: "listing",
    entityId: parsedListingId,
    changes: {
      previousStatus: listing.status,
      changes: parsedChanges,
      notes: resolution.notes,
    },
  });
}

async function updateListingRecord(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  listingId: string,
  changes: z.infer<typeof adminListingUpdateSchema>,
  status: string | null,
) {
  const result = await tx.execute<AdminListing>(sql`
    update listings
    set name = coalesce(${changes.name ?? null}, name),
        category = coalesce(${changes.category ?? null}::listing_category, category),
        description = case
          when ${changes.description === undefined} then description
          else ${changes.description ?? null}
        end,
        status = coalesce(${status}::listing_status, status),
        address = case
          when ${changes.address === undefined} then address
          else ${changes.address === undefined ? null : JSON.stringify(changes.address)}::jsonb
        end,
        attributes = case
          when ${changes.attributes === undefined} then attributes
          else ${changes.attributes === undefined ? null : JSON.stringify(changes.attributes)}::jsonb
        end,
        price_min = case
          when ${changes.priceMin === undefined} then price_min
          else ${changes.priceMin ?? null}
        end,
        price_max = case
          when ${changes.priceMax === undefined} then price_max
          else ${changes.priceMax ?? null}
        end,
        booking_mode = coalesce(${changes.bookingMode ?? null}::booking_mode, booking_mode),
        cancellation_policy = coalesce(${changes.cancellationPolicy ?? null}::cancellation_policy, cancellation_policy),
        downpayment_pct = coalesce(${changes.downpaymentPct ?? null}, downpayment_pct),
        contact_phone = case
          when ${changes.contactPhone === undefined} then contact_phone
          else ${changes.contactPhone ?? null}
        end,
        contact_facebook = case
          when ${changes.contactFacebook === undefined} then contact_facebook
          else ${changes.contactFacebook ?? null}
        end,
        contact_website = case
          when ${changes.contactWebsite === undefined} then contact_website
          else ${changes.contactWebsite ?? null}
        end,
        published_at = case
          when ${status}::listing_status = 'published'::listing_status then coalesce(published_at, now())
          when ${status}::listing_status is not null then null
          else published_at
        end,
        updated_at = now()
    where id = ${listingId}::uuid
    returning
      id::text as "id", slug, name, category, description, status,
      business_id::text as "businessId", null::text as "businessName",
      claim_status as "claimStatus", address, price_min as "priceMin", price_max as "priceMax",
      booking_mode as "bookingMode", contact_phone as "contactPhone",
      contact_facebook as "contactFacebook", contact_website as "contactWebsite",
      0::integer as "mediaCount", 0::integer as "bookingCount",
      published_at as "publishedAt", updated_at as "updatedAt"
  `);
  return result.rows[0] ?? null;
}

async function assertListingExists(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  listingId: string,
) {
  const result = await tx.execute(
    sql`select 1 from listings where id = ${listingId}::uuid`,
  );
  if (!result.rows[0]) throw new AdminDomainError("Listing not found.", 404);
}

async function writeAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: unknown;
  },
) {
  await tx.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (${input.actorId}::uuid, ${input.action}, ${input.entityType}, ${input.entityId}::uuid, ${JSON.stringify(input.changes)}::jsonb)
  `);
}

function normalizeModerationDetails(value: unknown): ModerationDetails | null {
  if (!value || typeof value !== "object") return null;
  return value as ModerationDetails;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return slug || `listing-${Date.now()}`;
}

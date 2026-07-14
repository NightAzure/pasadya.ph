import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { z } from "zod";

import { db } from "@/db/client";
import { AuthorizationError, authorize } from "@/lib/rbac";
import { listingSlugSchema, uuidSchema } from "@/lib/validation";
import { claimUploadSchema, photoUploadSchema } from "@/modules/portal/upload";
import { dispatchEvent } from "@/modules/notifications/service";

export const crowdLevels = ["quiet", "moderate", "busy", "full"] as const;
export const claimMethods = [
  "phone_otp",
  "email",
  "document",
  "photo_verification",
] as const;

export const claimRequestSchema = z.object({
  listingSlug: listingSlugSchema,
  claimantName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(180),
  contactPhone: z.string().trim().min(8).max(24),
  method: z.enum(claimMethods),
  otpCode: z.string().trim().max(12).optional(),
  fileName: z.string().trim().max(180).optional(),
  contentType: z.string().trim().max(80).optional(),
  sizeBytes: z.coerce.number().int().optional(),
  notes: z.string().trim().max(700).optional(),
});

export const listingEditSchema = z.object({
  listingId: uuidSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(20).max(1500),
  street: z.string().trim().max(180).optional(),
  barangay: z.string().trim().min(1).max(120),
  municipality: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  contactPhone: z.string().trim().max(24).optional(),
  contactFacebook: z.string().trim().max(240).optional(),
  contactWebsite: z.string().trim().max(240).optional(),
  amenitySlugs: z.array(z.string().trim().min(1)).default([]),
  rateName: z.string().trim().min(2).max(120),
  rateType: z
    .enum(["overnight", "day_use", "entrance", "package", "hourly"])
    .default("package"),
  ratePricePhp: z.coerce.number().int().min(0).max(1_000_000),
  rateUnit: z
    .enum(["per_night", "per_person", "per_group", "flat"])
    .default("flat"),
  rateDescription: z.string().trim().max(240).optional(),
  photoUrl: z.string().trim().max(400).optional(),
  photoFileName: z.string().trim().max(180).optional(),
  photoContentType: z.string().trim().max(80).optional(),
  photoSizeBytes: z.coerce.number().int().optional(),
});

export const availabilitySchema = z.object({
  listingId: uuidSchema,
  date: z.string().date(),
  available: z.enum(["true", "false"]).transform((value) => value === "true"),
  quantity: z.coerce.number().int().min(0).max(999).default(1),
});

export const crowdSchema = z.object({
  listingId: uuidSchema,
  level: z.enum(crowdLevels),
});

export type PortalActor = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "moderator" | "admin";
  isDevFallback: boolean;
};

type ActorRole = PortalActor["role"];

type ListingRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  claimStatus: "unclaimed" | "pending" | "claimed" | "disputed";
  businessId: string | null;
  businessName: string | null;
  contactPhone: string | null;
  contactFacebook: string | null;
  contactWebsite: string | null;
  address: Record<string, string>;
  attributes: Record<string, unknown>;
  priceMin: number | null;
  priceMax: number | null;
  rateCount: number;
  mediaCount: number;
  blockedDates: number;
  crowdLevel: (typeof crowdLevels)[number] | null;
  crowdExpiresAt: Date | null;
};

type ClaimQueueRow = {
  queueId: string;
  claimId: string;
  listingId: string;
  listingName: string;
  listingSlug: string;
  claimantName: string | null;
  claimantEmail: string | null;
  method: string;
  claimStatus: string;
  reason: string | null;
  createdAt: Date;
  verificationData: Record<string, unknown>;
};

export async function getPortalActor(options?: {
  session?: Session | null;
  minimumRole?: ActorRole;
}) {
  try {
    const session = await authorize({
      session: options?.session,
      minimumRole: options?.minimumRole,
    });

    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: session.user.role ?? "user",
      isDevFallback: false,
    } satisfies PortalActor;
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      process.env.NODE_ENV !== "production" &&
      process.env.VERCEL !== "1" &&
      (process.env.ALLOW_DEV_AUTH_FALLBACK === "true" ||
        !process.env.NEXT_PUBLIC_APP_URL ||
        /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_APP_URL))
    ) {
      return getDevActor(options?.minimumRole ?? "user");
    }

    throw error;
  }
}

export async function getListingForClaim(slug: string) {
  const parsed = listingSlugSchema.parse(slug);
  const result = await db.execute<ListingRow>(sql`
    select
      l.id::text as "id",
      l.slug,
      l.name,
      l.category,
      l.description,
      l.claim_status as "claimStatus",
      l.business_id::text as "businessId",
      b.display_name as "businessName",
      l.contact_phone as "contactPhone",
      l.contact_facebook as "contactFacebook",
      l.contact_website as "contactWebsite",
      l.address,
      l.attributes,
      l.price_min as "priceMin",
      l.price_max as "priceMax",
      0::integer as "rateCount",
      0::integer as "mediaCount",
      0::integer as "blockedDates",
      null::text as "crowdLevel",
      null::timestamptz as "crowdExpiresAt"
    from listings l
    left join businesses b on b.id = l.business_id
    where l.slug = ${parsed}
    limit 1
  `);

  return result.rows[0] ?? null;
}

export async function submitClaim(input: unknown, actorId: string) {
  const parsed = claimRequestSchema.parse(input);
  const listing = await getListingForClaim(parsed.listingSlug);

  if (!listing) {
    throw new Error("Listing not found.");
  }

  if (listing.claimStatus === "pending" || listing.claimStatus === "disputed") {
    throw new Error("This listing already has an active claim review.");
  }

  const isOwnershipTransfer = listing.claimStatus === "claimed";
  const isInstantMethod =
    !isOwnershipTransfer &&
    (parsed.method === "phone_otp" || parsed.method === "email");

  const upload = getClaimUploadData(parsed);
  const verificationData = {
    claimantName: parsed.claimantName,
    contactEmail: parsed.contactEmail,
    contactPhone: parsed.contactPhone,
    notes: parsed.notes ?? null,
    upload,
    devAutoApproved: isInstantMethod && process.env.NODE_ENV !== "production",
    ownershipTransfer: isOwnershipTransfer,
    retention:
      "Restricted admin access during MVP; deletion policy to be defined before public launch.",
  };

  if (isInstantMethod && process.env.NODE_ENV !== "production") {
    const claimId = await createClaimRequest({
      listingId: listing.id,
      actorId,
      method: parsed.method,
      status: "approved",
      verificationData,
    });
    await assignListingOwnership({
      listingId: listing.id,
      actorId,
      displayName: listing.name,
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
      claimId,
      transferred: false,
    });
    await dispatchEvent({
      userId: actorId,
      event: "claim.approved",
      data: {
        title: "Business claim approved",
        body: `${listing.name} is now connected to your owner portal.`,
        listingId: listing.id,
        claimId,
      },
    });
    return { status: "approved" as const, claimId };
  }

  const status = isOwnershipTransfer ? "disputed" : "pending";
  const claimId = await createClaimRequest({
    listingId: listing.id,
    actorId,
    method: parsed.method,
    status,
    verificationData,
  });

  await db.execute(sql`
    insert into moderation_queue (type, reference_id, reason)
    values (
      'claim',
      ${claimId}::uuid,
      ${isOwnershipTransfer ? "Ownership transfer request" : "Manual claim verification"}
    )
  `);

  await db.execute(sql`
    update listings
    set claim_status = ${isOwnershipTransfer ? "disputed" : "pending"}::claim_status,
        updated_at = now()
    where id = ${listing.id}::uuid
  `);

  await dispatchEvent({
    userId: actorId,
    event: "claim.submitted",
    data: {
      title: "Claim submitted for review",
      body: `We received your request for ${listing.name}. A moderator will review it.`,
      listingId: listing.id,
      claimId,
    },
  });

  return { status, claimId };
}

export async function getOwnerDashboard(actorId: string) {
  const result = await db.execute<ListingRow>(sql`
    select
      l.id::text as "id",
      l.slug,
      l.name,
      l.category,
      l.description,
      l.claim_status as "claimStatus",
      l.business_id::text as "businessId",
      b.display_name as "businessName",
      l.contact_phone as "contactPhone",
      l.contact_facebook as "contactFacebook",
      l.contact_website as "contactWebsite",
      l.address,
      l.attributes,
      l.price_min as "priceMin",
      l.price_max as "priceMax",
      coalesce(rate_counts.count, 0)::integer as "rateCount",
      coalesce(media_counts.count, 0)::integer as "mediaCount",
      coalesce(block_counts.count, 0)::integer as "blockedDates",
      crowd.level as "crowdLevel",
      crowd.expires_at as "crowdExpiresAt"
    from listings l
    join businesses b on b.id = l.business_id
    left join lateral (
      select count(*)::integer as count
      from rate_plans rp
      where rp.listing_id = l.id and rp.active = true
    ) rate_counts on true
    left join lateral (
      select count(*)::integer as count
      from listing_media lm
      where lm.listing_id = l.id
    ) media_counts on true
    left join lateral (
      select count(*)::integer as count
      from availability_blocks ab
      where ab.listing_id = l.id and ab.available = false
    ) block_counts on true
    left join lateral (
      select cr.level, cr.expires_at
      from crowd_reports cr
      where cr.listing_id = l.id
        and cr.source = 'business'
        and (cr.expires_at is null or cr.expires_at > now())
      order by cr.created_at desc
      limit 1
    ) crowd on true
    where b.owner_id = ${actorId}::uuid
    order by l.updated_at desc
  `);

  return result.rows;
}

export async function getOwnerListing(actorId: string, listingId: string) {
  await assertOwnerCanManageListing(actorId, listingId);

  const result = await db.execute<
    ListingRow & {
      amenities: { slug: string; name: string }[];
      ratePlans: {
        id: string;
        name: string;
        type: string;
        price: number;
        priceUnit: string;
        description: string | null;
      }[];
      media: { id: string; url: string; caption: string | null }[];
      availability: {
        id: string;
        date: string;
        available: boolean;
        quantity: number;
      }[];
    }
  >(sql`
    select
      l.id::text as "id",
      l.slug,
      l.name,
      l.category,
      l.description,
      l.claim_status as "claimStatus",
      l.business_id::text as "businessId",
      b.display_name as "businessName",
      l.contact_phone as "contactPhone",
      l.contact_facebook as "contactFacebook",
      l.contact_website as "contactWebsite",
      l.address,
      l.attributes,
      l.price_min as "priceMin",
      l.price_max as "priceMax",
      0::integer as "rateCount",
      0::integer as "mediaCount",
      0::integer as "blockedDates",
      null::text as "crowdLevel",
      null::timestamptz as "crowdExpiresAt",
      coalesce(amenities.items, '[]'::json) as "amenities",
      coalesce(rates.items, '[]'::json) as "ratePlans",
      coalesce(media.items, '[]'::json) as "media",
      coalesce(blocks.items, '[]'::json) as "availability"
    from listings l
    join businesses b on b.id = l.business_id
    left join lateral (
      select json_agg(json_build_object('slug', a.slug, 'name', a.name) order by a.name) as items
      from listing_amenities la
      join amenities a on a.id = la.amenity_id
      where la.listing_id = l.id
    ) amenities on true
    left join lateral (
      select json_agg(json_build_object(
        'id', rp.id::text,
        'name', rp.name,
        'type', rp.type,
        'price', rp.price,
        'priceUnit', rp.price_unit,
        'description', rp.description
      ) order by rp.sort_order) as items
      from rate_plans rp
      where rp.listing_id = l.id and rp.active = true
    ) rates on true
    left join lateral (
      select json_agg(json_build_object(
        'id', lm.id::text,
        'url', lm.url,
        'caption', lm.caption
      ) order by lm.sort_order) as items
      from listing_media lm
      where lm.listing_id = l.id
    ) media on true
    left join lateral (
      select json_agg(json_build_object(
        'id', ab.id::text,
        'date', ab.date::text,
        'available', ab.available,
        'quantity', ab.quantity
      ) order by ab.date) as items
      from availability_blocks ab
      where ab.listing_id = l.id and ab.date >= current_date
    ) blocks on true
    where l.id = ${listingId}::uuid
    limit 1
  `);

  return result.rows[0] ?? null;
}

export async function getAllAmenities() {
  const result = await db.execute<{ slug: string; name: string }>(sql`
    select slug, name
    from amenities
    order by name
  `);

  return result.rows;
}

export async function updateOwnerListing(input: unknown, actorId: string) {
  const parsed = listingEditSchema.parse(input);
  if (parsed.photoUrl) {
    photoUploadSchema.parse({
      fileName: parsed.photoFileName,
      contentType: parsed.photoContentType,
      sizeBytes: parsed.photoSizeBytes,
    });
  }

  await assertOwnerCanManageListing(actorId, parsed.listingId);
  const address = {
    street: parsed.street ?? "",
    barangay: parsed.barangay,
    municipality: parsed.municipality,
    province: parsed.province,
  };
  const price = parsed.ratePricePhp * 100;

  await db.execute(sql`
    update listings
    set name = ${parsed.name},
        description = ${parsed.description},
        address = ${JSON.stringify(address)}::jsonb,
        contact_phone = ${parsed.contactPhone || null},
        contact_facebook = ${parsed.contactFacebook || null},
        contact_website = ${parsed.contactWebsite || null},
        price_min = ${price},
        price_max = greatest(coalesce(price_max, ${price}), ${price}),
        search_vector = to_tsvector('english', ${`${parsed.name} ${parsed.description} ${parsed.barangay} ${parsed.municipality}`}),
        updated_at = now()
    where id = ${parsed.listingId}::uuid
  `);

  await db.execute(sql`
    delete from listing_amenities
    where listing_id = ${parsed.listingId}::uuid
  `);

  if (parsed.amenitySlugs.length > 0) {
    await db.execute(sql`
      insert into listing_amenities (listing_id, amenity_id)
      select ${parsed.listingId}::uuid, a.id
      from amenities a
      where a.slug in (${sql.join(
        parsed.amenitySlugs.map((slug) => sql`${slug}`),
        sql`, `,
      )})
      on conflict do nothing
    `);
  }

  await db.execute(sql`
    insert into rate_plans (
      listing_id,
      name,
      type,
      price,
      price_unit,
      description,
      active,
      sort_order
    )
    values (
      ${parsed.listingId}::uuid,
      ${parsed.rateName},
      ${parsed.rateType}::rate_plan_type,
      ${price},
      ${parsed.rateUnit}::price_unit,
      ${parsed.rateDescription || null},
      true,
      1
    )
  `);

  if (parsed.photoUrl) {
    await db.execute(sql`
      insert into listing_media (
        listing_id,
        url,
        type,
        caption,
        sort_order,
        uploaded_by,
        moderated
      )
      values (
        ${parsed.listingId}::uuid,
        ${parsed.photoUrl},
        'photo',
        ${`Owner photo for ${parsed.name}; EXIF GPS stripped before production storage.`},
        99,
        ${actorId}::uuid,
        true
      )
    `);
  }

  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${actorId}::uuid,
      'listing.owner_update',
      'listing',
      ${parsed.listingId}::uuid,
      ${JSON.stringify({ fields: ["basics", "amenities", "rates", "contact", "photos"] })}::jsonb
    )
  `);
}

export async function setAvailabilityBlock(input: unknown, actorId: string) {
  const parsed = availabilitySchema.parse(input);
  await assertOwnerCanManageListing(actorId, parsed.listingId);

  await db.execute(sql`
    delete from availability_blocks
    where listing_id = ${parsed.listingId}::uuid
      and rate_plan_id is null
      and date = ${parsed.date}::date
  `);

  await db.execute(sql`
    insert into availability_blocks (listing_id, rate_plan_id, date, available, quantity)
    values (
      ${parsed.listingId}::uuid,
      null,
      ${parsed.date}::date,
      ${parsed.available},
      ${parsed.quantity}
    )
  `);

  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${actorId}::uuid,
      'availability.owner_update',
      'listing',
      ${parsed.listingId}::uuid,
      ${JSON.stringify({ date: parsed.date, available: parsed.available })}::jsonb
    )
  `);
}

export async function setBusinessCrowd(input: unknown, actorId: string) {
  const parsed = crowdSchema.parse(input);
  await assertOwnerCanManageListing(actorId, parsed.listingId);
  const source = "reported by the business; expires in 12 hours";

  await db.execute(sql`
    insert into crowd_reports (listing_id, user_id, source, level, expires_at)
    values (
      ${parsed.listingId}::uuid,
      ${actorId}::uuid,
      'business',
      ${parsed.level}::crowd_level,
      now() + interval '12 hours'
    )
  `);

  await db.execute(sql`
    update listings
    set attributes = jsonb_set(
          jsonb_set(attributes, '{crowd_level}', to_jsonb(${parsed.level}::text), true),
          '{crowd_source}',
          to_jsonb(${source}::text),
          true
        ),
        updated_at = now()
    where id = ${parsed.listingId}::uuid
  `);
}

export async function getClaimModerationQueue() {
  const result = await db.execute<ClaimQueueRow>(sql`
    select
      mq.id::text as "queueId",
      cr.id::text as "claimId",
      l.id::text as "listingId",
      l.name as "listingName",
      l.slug as "listingSlug",
      u.name as "claimantName",
      u.email as "claimantEmail",
      cr.method,
      cr.status as "claimStatus",
      mq.reason,
      mq.created_at as "createdAt",
      cr.verification_data as "verificationData"
    from moderation_queue mq
    join claim_requests cr on cr.id = mq.reference_id
    join listings l on l.id = cr.listing_id
    join users u on u.id = cr.user_id
    where mq.type = 'claim' and mq.status = 'pending'
    order by mq.created_at asc
  `);

  return result.rows;
}

export async function approveClaim(claimId: string, reviewerId: string) {
  const parsedClaimId = uuidSchema.parse(claimId);
  const result = await db.execute<{
    claimId: string;
    listingId: string;
    actorId: string;
    listingName: string;
    status: string;
    verificationData: Record<string, unknown>;
  }>(sql`
    select
      cr.id::text as "claimId",
      cr.listing_id::text as "listingId",
      cr.user_id::text as "actorId",
      l.name as "listingName",
      cr.status,
      cr.verification_data as "verificationData"
    from claim_requests cr
    join listings l on l.id = cr.listing_id
    where cr.id = ${parsedClaimId}::uuid
    limit 1
  `);
  const claim = result.rows[0];

  if (!claim) {
    throw new Error("Claim request not found.");
  }

  if (claim.status !== "pending" && claim.status !== "disputed") {
    throw new Error("Claim request has already been reviewed.");
  }

  const data = claim.verificationData ?? {};
  await assignListingOwnership({
    listingId: claim.listingId,
    actorId: claim.actorId,
    displayName: claim.listingName,
    contactEmail: stringOrNull(data.contactEmail),
    contactPhone: stringOrNull(data.contactPhone),
    claimId: parsedClaimId,
    transferred: claim.status === "disputed",
    reviewerId,
  });
  await dispatchEvent({
    userId: claim.actorId,
    event: "claim.approved",
    data: {
      title: "Business claim approved",
      body: `${claim.listingName} is now connected to your owner portal.`,
      listingId: claim.listingId,
      claimId: parsedClaimId,
    },
  });
}

export async function rejectClaim(
  claimId: string,
  reviewerId: string,
  notes: string,
) {
  const parsedClaimId = uuidSchema.parse(claimId);
  const result = await db.execute<{
    listingId: string;
    status: string;
    actorId: string;
    listingName: string;
  }>(sql`
    select cr.listing_id::text as "listingId", cr.status, cr.user_id::text as "actorId", l.name as "listingName"
    from claim_requests cr join listings l on l.id = cr.listing_id
    where cr.id = ${parsedClaimId}::uuid
    limit 1
  `);
  const claim = result.rows[0];

  if (!claim) {
    throw new Error("Claim request not found.");
  }

  if (claim.status !== "pending" && claim.status !== "disputed") {
    throw new Error("Claim request has already been reviewed.");
  }

  await db.execute(sql`
    update claim_requests
    set status = 'rejected',
        reviewed_by = ${reviewerId}::uuid,
        reviewed_at = now(),
        admin_notes = ${notes}
    where id = ${parsedClaimId}::uuid
  `);

  await dispatchEvent({
    userId: claim.actorId,
    event: "claim.rejected",
    data: {
      title: "Claim needs attention",
      body: `${claim.listingName} was not approved. Check the owner portal for the moderator note.`,
      listingId: claim.listingId,
      claimId: parsedClaimId,
    },
  });

  await db.execute(sql`
    update moderation_queue
    set status = 'rejected',
        reviewer_id = ${reviewerId}::uuid,
        reviewer_notes = ${notes},
        resolved_at = now()
    where type = 'claim' and reference_id = ${parsedClaimId}::uuid
  `);

  await db.execute(sql`
    update listings
    set claim_status = ${claim.status === "disputed" ? "claimed" : "unclaimed"}::claim_status,
        updated_at = now()
    where id = ${claim.listingId}::uuid
  `);
}

export function redirectAfterAction(path: string) {
  redirect(path);
}

async function createClaimRequest({
  listingId,
  actorId,
  method,
  status,
  verificationData,
}: {
  listingId: string;
  actorId: string;
  method: (typeof claimMethods)[number];
  status: "pending" | "approved" | "disputed";
  verificationData: Record<string, unknown>;
}) {
  const result = await db.execute<{ id: string }>(sql`
    insert into claim_requests (
      listing_id,
      user_id,
      method,
      status,
      verification_data,
      reviewed_at
    )
    values (
      ${listingId}::uuid,
      ${actorId}::uuid,
      ${method}::claim_method,
      ${status}::claim_request_status,
      ${JSON.stringify(verificationData)}::jsonb,
      ${status === "approved" ? sql`now()` : sql`null`}
    )
    returning id::text
  `);

  return result.rows[0]?.id ?? "";
}

async function assignListingOwnership({
  listingId,
  actorId,
  displayName,
  contactEmail,
  contactPhone,
  claimId,
  transferred,
  reviewerId,
}: {
  listingId: string;
  actorId: string;
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  claimId: string;
  transferred: boolean;
  reviewerId?: string;
}) {
  const business = await db.execute<{ id: string }>(sql`
    insert into businesses (
      owner_id,
      display_name,
      contact_phone,
      contact_email,
      verified_at
    )
    values (
      ${actorId}::uuid,
      ${displayName},
      ${contactPhone},
      ${contactEmail},
      now()
    )
    returning id::text
  `);
  const businessId = business.rows[0]?.id;

  if (!businessId) {
    throw new Error("Business ownership record could not be created.");
  }

  await db.execute(sql`
    update listings
    set business_id = ${businessId}::uuid,
        claim_status = 'claimed',
        updated_at = now()
    where id = ${listingId}::uuid
  `);

  await db.execute(sql`
    update claim_requests
    set status = ${transferred ? "transferred" : "approved"}::claim_request_status,
        reviewed_by = ${reviewerId ? sql`${reviewerId}::uuid` : sql`reviewed_by`},
        reviewed_at = now()
    where id = ${claimId}::uuid
  `);

  await db.execute(sql`
    update moderation_queue
    set status = 'approved',
        reviewer_id = ${reviewerId ? sql`${reviewerId}::uuid` : sql`reviewer_id`},
        resolved_at = now()
    where type = 'claim' and reference_id = ${claimId}::uuid
  `);

  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${reviewerId ?? actorId}::uuid,
      ${transferred ? "claim.transferred" : "claim.approved"},
      'listing',
      ${listingId}::uuid,
      ${JSON.stringify({ claimId, businessId })}::jsonb
    )
  `);
}

async function assertOwnerCanManageListing(actorId: string, listingId: string) {
  const parsedListingId = uuidSchema.parse(listingId);
  const result = await db.execute<{ ok: boolean }>(sql`
    select true as ok
    from listings l
    join businesses b on b.id = l.business_id
    where l.id = ${parsedListingId}::uuid
      and b.owner_id = ${actorId}::uuid
    limit 1
  `);

  if (!result.rows[0]?.ok) {
    throw new AuthorizationError("Owner access required");
  }
}

function getClaimUploadData(parsed: z.output<typeof claimRequestSchema>) {
  if (parsed.method !== "document" && parsed.method !== "photo_verification") {
    return null;
  }

  const uploadMetadata = {
    fileName: parsed.fileName ?? "",
    contentType: parsed.contentType,
    sizeBytes: parsed.sizeBytes,
  };

  return claimUploadSchema.parse(uploadMetadata);
}

async function getDevActor(minimumRole: ActorRole) {
  const email =
    minimumRole === "admin" || minimumRole === "moderator"
      ? "dev-admin@example.test"
      : "dev-user@example.test";
  const role =
    minimumRole === "admin" || minimumRole === "moderator" ? "admin" : "user";

  await db.execute(sql`
    insert into users (email, name, role, auth_provider, email_verified)
    values (
      ${email},
      ${role === "admin" ? "Dev Admin" : "Dev User"},
      ${role}::user_role,
      'email',
      now()
    )
    on conflict (email) do update
    set name = excluded.name,
        role = excluded.role,
        email_verified = excluded.email_verified
  `);

  const result = await db.execute<{
    id: string;
    email: string | null;
    name: string | null;
    role: ActorRole;
  }>(sql`
    select id::text, email, name, role
    from users
    where email = ${email}
    limit 1
  `);
  const actor = result.rows[0];

  if (!actor) {
    throw new Error("Development actor could not be created.");
  }

  return {
    ...actor,
    isDevFallback: true,
  } satisfies PortalActor;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

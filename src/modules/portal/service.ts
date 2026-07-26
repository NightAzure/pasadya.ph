import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { z } from "zod";

import { db } from "@/db/client";
import { isLaunchCoordinate } from "@/lib/launch-region";
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

export const listingEditSchema = z
  .object({
    listingId: uuidSchema,
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().min(20).max(1500),
    street: z.string().trim().max(180).optional(),
    barangay: z.string().trim().min(1).max(120),
    municipality: z.string().trim().min(1).max(120),
    province: z.string().trim().min(1).max(120),
    locationConfirmed: z
      .enum(["true"])
      .transform(() => true)
      .optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
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
    billingPeriod: z.enum(["once", "night", "day", "hour"]).optional(),
    billingUnit: z.enum(["inventory_unit", "person", "group"]).optional(),
    includedPax: z.coerce.number().int().min(0).max(10_000).optional(),
    extraPaxChargePhp: z.coerce.number().int().min(0).max(1_000_000).optional(),
    capacityPerUnit: z.coerce.number().int().min(1).max(10_000).optional(),
    inventoryUnitLabel: z.string().trim().min(1).max(80).optional(),
    minPax: z.coerce.number().int().min(1).max(10_000).optional(),
    maxPax: z.coerce.number().int().min(1).max(10_000).optional(),
    availableQuantity: z.coerce.number().int().min(0).max(10_000).optional(),
    mandatoryFeePhp: z.coerce.number().int().min(0).max(1_000_000).optional(),
    mandatoryFeeLabel: z.string().trim().max(120).optional(),
    feeDisclosureConfirmed: z
      .enum(["true"])
      .transform(() => true)
      .optional(),
    categoryAttributes: z.string().trim().max(4_000).default("{}"),
    weeklyHours: z.string().trim().max(4_000).default("[]"),
    specialHours: z.string().trim().max(4_000).default("[]"),
    photoUrl: z
      .string()
      .trim()
      .max(400)
      .refine(
        (value) =>
          !value ||
          value.startsWith("/uploads/") ||
          value.startsWith("/listings/"),
        "Use a Pasadya upload URL; external image URLs are not accepted.",
      )
      .optional(),
    photoFileName: z.string().trim().max(180).optional(),
    photoContentType: z.string().trim().max(80).optional(),
    photoSizeBytes: z.coerce.number().int().optional(),
  })
  .superRefine((input, context) => {
    if (!input.locationConfirmed) return;
    const requiredFields = [
      "latitude",
      "longitude",
      "billingPeriod",
      "billingUnit",
      "includedPax",
      "extraPaxChargePhp",
      "capacityPerUnit",
      "inventoryUnitLabel",
      "minPax",
      "maxPax",
      "availableQuantity",
      "mandatoryFeePhp",
      "feeDisclosureConfirmed",
    ] as const;
    for (const field of requiredFields)
      if (input[field] === undefined)
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Complete this search-data field before saving.",
        });
    if (
      input.minPax !== undefined &&
      input.maxPax !== undefined &&
      input.minPax > input.maxPax
    ) {
      context.addIssue({
        code: "custom",
        path: ["maxPax"],
        message: "Maximum guests must be at least the minimum.",
      });
    }
    if (input.mandatoryFeePhp && !input.mandatoryFeeLabel) {
      context.addIssue({
        code: "custom",
        path: ["mandatoryFeeLabel"],
        message:
          "Name the one fixed per-booking mandatory fee that guests must pay.",
      });
    }
    if (
      input.includedPax !== undefined &&
      input.minPax !== undefined &&
      input.maxPax !== undefined &&
      (input.includedPax < input.minPax || input.includedPax > input.maxPax)
    ) {
      context.addIssue({
        code: "custom",
        path: ["includedPax"],
        message: "Included guests must fall within the guest range.",
      });
    }
    if (
      input.latitude !== undefined &&
      input.longitude !== undefined &&
      !isSupportedCoordinate(input.latitude, input.longitude)
    ) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message:
          "Choose a pin in the Samal or Davao City launch area. Ask an admin for an exception.",
      });
    }
  });

export function isSupportedCoordinate(latitude: number, longitude: number) {
  return isLaunchCoordinate(latitude, longitude);
}

export const availabilitySchema = z.object({
  listingId: uuidSchema,
  ratePlanId: uuidSchema.optional(),
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
        billingPeriod: string | null;
        billingUnit: string | null;
        includedPax: number | null;
        extraPaxCharge: number | null;
        capacityPerUnit: number | null;
        inventoryUnitLabel: string | null;
        minPax: number;
        maxPax: number | null;
        availableQuantity: number | null;
        mandatoryFee: number | null;
        mandatoryFeeLabel: string | null;
        mandatoryChargeDisclosureStatus: string;
        isPrimary: boolean;
        description: string | null;
      }[];
      media: { id: string; url: string; caption: string | null }[];
      availability: {
        id: string;
        date: string;
        available: boolean;
        quantity: number;
      }[];
      location: { latitude: number; longitude: number } | null;
      weeklyHours: {
        dayOfWeek: number;
        opensAt: string | null;
        closesAt: string | null;
        isClosed: boolean;
      }[];
      specialHours: {
        date: string;
        opensAt: string | null;
        closesAt: string | null;
        isClosed: boolean;
        note: string | null;
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
      case when l.location is null then null else json_build_object('latitude', ST_Y(l.location::geometry), 'longitude', ST_X(l.location::geometry)) end as "location",
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
      coalesce(blocks.items, '[]'::json) as "availability",
      coalesce(weekly.items, '[]'::json) as "weeklyHours",
      coalesce(special.items, '[]'::json) as "specialHours"
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
        'billingPeriod', rp.billing_period,
        'billingUnit', rp.billing_unit,
        'includedPax', rp.included_pax,
        'extraPaxCharge', rp.extra_pax_charge,
        'capacityPerUnit', rp.capacity_per_unit,
        'inventoryUnitLabel', rp.inventory_unit_label,
        'minPax', rp.min_pax,
        'maxPax', rp.max_pax,
        'availableQuantity', rp.available_quantity,
        'mandatoryFee', rp.mandatory_fee,
        'mandatoryFeeLabel', rp.mandatory_fee_label,
        'mandatoryChargeDisclosureStatus', rp.mandatory_charge_disclosure_status,
        'isPrimary', rp.is_primary,
        'description', rp.description
      ) order by rp.is_primary desc, rp.sort_order) as items
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
    left join lateral (
      select json_agg(json_build_object('dayOfWeek', h.day_of_week, 'opensAt', h.opens_at::text, 'closesAt', h.closes_at::text, 'isClosed', h.is_closed) order by h.day_of_week) as items
      from listing_opening_hours h where h.listing_id = l.id
    ) weekly on true
    left join lateral (
      select json_agg(json_build_object('date', h.date::text, 'opensAt', h.opens_at::text, 'closesAt', h.closes_at::text, 'isClosed', h.is_closed, 'note', h.note) order by h.date) as items
      from listing_special_hours h where h.listing_id = l.id
    ) special on true
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
  const raw = listingEditSchema.parse(input);
  if (!raw.locationConfirmed) return updateOwnerListingLegacy(raw, actorId);
  const parsed = raw as typeof raw & {
    latitude: number;
    longitude: number;
    billingPeriod: "once" | "night" | "day" | "hour";
    billingUnit: "inventory_unit" | "person" | "group";
    includedPax: number;
    extraPaxChargePhp: number;
    capacityPerUnit: number;
    inventoryUnitLabel: string;
    minPax: number;
    maxPax: number;
    availableQuantity: number;
  };
  if (parsed.photoUrl) {
    photoUploadSchema.parse({
      fileName: parsed.photoFileName,
      contentType: parsed.photoContentType,
      sizeBytes: parsed.photoSizeBytes,
    });
  }

  const listingCategory = await assertOwnerCanManageListing(
    actorId,
    parsed.listingId,
  );
  const address = {
    street: parsed.street ?? "",
    barangay: parsed.barangay,
    municipality: parsed.municipality,
    province: parsed.province,
  };
  const price = parsed.ratePricePhp * 100;
  const attributes = parseOwnerJson(parsed.categoryAttributes, listingCategory);
  const weeklyHours = parseHours(parsed.weeklyHours, false);
  const specialHours = parseHours(parsed.specialHours, true);

  await db.transaction(async (tx) => {
    const before = await tx.execute<{
      address: Record<string, unknown>;
      location: { latitude: number; longitude: number } | null;
    }>(sql`
      select address, case when location is null then null else json_build_object('latitude', ST_Y(location::geometry), 'longitude', ST_X(location::geometry)) end as location
      from listings where id = ${parsed.listingId}::uuid for update
    `);
    await tx.execute(sql`
      update listings
      set name = ${parsed.name},
        description = ${parsed.description},
        address = ${JSON.stringify(address)}::jsonb,
        attributes = ${JSON.stringify(attributes)}::jsonb,
        location = ST_SetSRID(ST_MakePoint(${parsed.longitude}, ${parsed.latitude}), 4326)::geography,
        location_source = 'owner'::location_source,
        location_accuracy = 'exact'::location_accuracy,
        location_verification_status = 'owner_provided'::listing_trust_status,
        location_last_verified_at = now(),
        location_verified_by = ${actorId}::uuid,
        contact_phone = ${parsed.contactPhone || null},
        contact_facebook = ${parsed.contactFacebook || null},
        contact_website = ${parsed.contactWebsite || null},
        price_min = ${price},
        price_max = greatest(coalesce(price_max, ${price}), ${price}),
        search_vector = to_tsvector('english', ${`${parsed.name} ${parsed.description} ${parsed.barangay} ${parsed.municipality}`}),
        updated_at = now()
      where id = ${parsed.listingId}::uuid
    `);

    await tx.execute(sql`
    delete from listing_amenities
    where listing_id = ${parsed.listingId}::uuid
    `);

    if (parsed.amenitySlugs.length > 0) {
      await tx.execute(sql`
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

    await tx.execute(
      sql`update rate_plans set is_primary = false where listing_id = ${parsed.listingId}::uuid and active`,
    );
    const existingRate = await tx.execute<{ id: string }>(sql`
      select id::text from rate_plans where listing_id = ${parsed.listingId}::uuid and active order by sort_order, id limit 1 for update
    `);
    if (existingRate.rows[0]?.id) {
      await tx.execute(sql`
        update rate_plans set name = ${parsed.rateName}, type = ${parsed.rateType}::rate_plan_type,
          price = ${price}, price_unit = ${parsed.rateUnit}::price_unit,
          billing_period = ${parsed.billingPeriod}, billing_unit = ${parsed.billingUnit},
          included_pax = ${parsed.includedPax}, extra_pax_charge = ${parsed.extraPaxChargePhp * 100},
          capacity_per_unit = ${parsed.capacityPerUnit}, inventory_unit_label = ${parsed.inventoryUnitLabel},
          min_pax = ${parsed.minPax}, max_pax = ${parsed.maxPax}, available_quantity = ${parsed.availableQuantity},
          mandatory_fee = ${(parsed.mandatoryFeePhp ?? 0) * 100}, mandatory_fee_label = ${parsed.mandatoryFeeLabel || null}, mandatory_fee_basis = 'fixed_per_booking',
          fees_declared_at = now(), mandatory_charge_disclosure_status = ${(parsed.mandatoryFeePhp ?? 0) > 0 ? "itemized" : "none"},
          pricing_trust_status = 'owner_provided'::listing_trust_status, pricing_verified_at = now(), pricing_valid_until = now() + interval '30 days',
          availability_trust_status = 'owner_provided'::listing_trust_status, availability_verified_at = now(), availability_valid_until = now() + interval '7 days',
          quote_eligibility = 'eligible', is_primary = true, description = ${parsed.rateDescription || null}
        where id = ${existingRate.rows[0].id}::uuid
      `);
    } else {
      await tx.execute(sql`
        insert into rate_plans (listing_id, name, type, price, price_unit, billing_period, billing_unit, included_pax, extra_pax_charge, capacity_per_unit, inventory_unit_label, min_pax, max_pax, available_quantity, mandatory_fee, mandatory_fee_label, mandatory_fee_basis, fees_declared_at, mandatory_charge_disclosure_status, pricing_trust_status, pricing_verified_at, pricing_valid_until, availability_trust_status, availability_verified_at, availability_valid_until, quote_eligibility, is_primary, description, active, sort_order)
        values (${parsed.listingId}::uuid, ${parsed.rateName}, ${parsed.rateType}::rate_plan_type, ${price}, ${parsed.rateUnit}::price_unit, ${parsed.billingPeriod}, ${parsed.billingUnit}, ${parsed.includedPax}, ${parsed.extraPaxChargePhp * 100}, ${parsed.capacityPerUnit}, ${parsed.inventoryUnitLabel}, ${parsed.minPax}, ${parsed.maxPax}, ${parsed.availableQuantity}, ${(parsed.mandatoryFeePhp ?? 0) * 100}, ${parsed.mandatoryFeeLabel || null}, 'fixed_per_booking', now(), ${(parsed.mandatoryFeePhp ?? 0) > 0 ? "itemized" : "none"}, 'owner_provided', now(), now() + interval '30 days', 'owner_provided', now(), now() + interval '7 days', 'eligible', true, ${parsed.rateDescription || null}, true, 1)
      `);
    }

    await tx.execute(
      sql`delete from listing_opening_hours where listing_id = ${parsed.listingId}::uuid`,
    );
    for (const hour of weeklyHours) {
      await tx.execute(
        sql`insert into listing_opening_hours (listing_id, day_of_week, opens_at, closes_at, is_closed) values (${parsed.listingId}::uuid, ${hour.dayOfWeek}, ${hour.opensAt}, ${hour.closesAt}, ${hour.isClosed})`,
      );
    }
    await tx.execute(
      sql`delete from listing_special_hours where listing_id = ${parsed.listingId}::uuid`,
    );
    for (const hour of specialHours) {
      await tx.execute(
        sql`insert into listing_special_hours (listing_id, date, opens_at, closes_at, is_closed, note) values (${parsed.listingId}::uuid, ${hour.date}::date, ${hour.opensAt}, ${hour.closesAt}, ${hour.isClosed}, ${hour.note})`,
      );
    }

    const source = await tx.execute<{ id: string }>(sql`
      insert into listing_sources (listing_id, provider, rights_classification, retention_classification, last_checked_at)
      values (${parsed.listingId}::uuid, 'owner_portal', 'owner_provided'::source_rights_classification, 'retain'::source_retention_classification, now())
      returning id::text as id
    `);
    const sourceId = source.rows[0]?.id;
    for (const fieldName of [
      "location",
      "rate",
      "capacity",
      "hours",
      "attributes",
    ]) {
      await tx.execute(
        sql`update listing_field_provenance set is_canonical = false, updated_at = now() where listing_id = ${parsed.listingId}::uuid and field_name = ${fieldName} and is_canonical`,
      );
      await tx.execute(
        sql`insert into listing_field_provenance (listing_id, field_name, source_id, trust_status, is_canonical, checked_at, source_note) values (${parsed.listingId}::uuid, ${fieldName}, ${sourceId}::uuid, 'owner_provided'::listing_trust_status, true, now(), 'Owner confirmed this field in the portal.')`,
      );
    }

    if (parsed.photoUrl) {
      const photo = await tx.execute<{ id: string }>(sql`
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
        false
      )
      returning id::text as id
    `);
      const photoId = photo.rows[0]?.id;
      if (!photoId)
        throw new Error("Photo moderation record could not be created.");
      await tx.execute(sql`
        insert into moderation_queue (type, reference_id, reason)
        values ('photo'::moderation_type, ${photoId}::uuid, 'Owner photo pending moderation.')
      `);
    }

    await tx.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${actorId}::uuid,
      'listing.owner_update',
      'listing',
      ${parsed.listingId}::uuid,
      ${JSON.stringify({ previousLocation: before.rows[0]?.location ?? null, fields: ["location", "rate", "capacity", "hours", "provenance", "attributes", "amenities", "contact"] })}::jsonb
    )
  `);
  });
}

async function updateOwnerListingLegacy(
  parsed: z.output<typeof listingEditSchema>,
  actorId: string,
) {
  if (parsed.photoUrl) {
    photoUploadSchema.parse({
      fileName: parsed.photoFileName,
      contentType: parsed.photoContentType,
      sizeBytes: parsed.photoSizeBytes,
    });
  }
  await assertOwnerCanManageListing(actorId, parsed.listingId);
  const price = parsed.ratePricePhp * 100;
  const address = {
    street: parsed.street ?? "",
    barangay: parsed.barangay,
    municipality: parsed.municipality,
    province: parsed.province,
  };
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`update listings set name = ${parsed.name}, description = ${parsed.description}, address = ${JSON.stringify(address)}::jsonb, contact_phone = ${parsed.contactPhone || null}, contact_facebook = ${parsed.contactFacebook || null}, contact_website = ${parsed.contactWebsite || null}, price_min = ${price}, price_max = greatest(coalesce(price_max, ${price}), ${price}), updated_at = now() where id = ${parsed.listingId}::uuid`,
    );
    await tx.execute(
      sql`insert into rate_plans (listing_id, name, type, price, price_unit, description, active, sort_order) values (${parsed.listingId}::uuid, ${parsed.rateName}, ${parsed.rateType}::rate_plan_type, ${price}, ${parsed.rateUnit}::price_unit, ${parsed.rateDescription || null}, true, 99)`,
    );
    if (parsed.photoUrl) {
      const photo = await tx.execute<{ id: string }>(
        sql`insert into listing_media (listing_id, url, type, caption, sort_order, uploaded_by, moderated) values (${parsed.listingId}::uuid, ${parsed.photoUrl}, 'photo', ${`Owner photo for ${parsed.name}; EXIF GPS stripped before production storage.`}, 99, ${actorId}::uuid, false) returning id::text as id`,
      );
      const photoId = photo.rows[0]?.id;
      if (!photoId)
        throw new Error("Photo moderation record could not be created.");
      await tx.execute(sql`
        insert into moderation_queue (type, reference_id, reason)
        values ('photo'::moderation_type, ${photoId}::uuid, 'Owner photo pending moderation.')
      `);
    }
    await tx.execute(
      sql`insert into audit_log (actor_id, action, entity_type, entity_id, changes) values (${actorId}::uuid, 'listing.owner_update_legacy', 'listing', ${parsed.listingId}::uuid, ${JSON.stringify({ fields: ["basics", "rate", "contact"] })}::jsonb)`,
    );
  });
}

function parseOwnerJson(
  value: string,
  category: string,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    const attributes = parsed as Record<string, unknown>;
    const allowedFields: Record<string, readonly string[]> = {
      resort: ["day_use", "overnight", "room_count", "beach_access"],
      room: ["room_type", "air_conditioned", "bed_count"],
      restaurant: ["cuisine", "halal", "reservations"],
      activity: ["duration_hours", "includes", "max_pax"],
      service: ["service_type", "duration_hours", "max_pax"],
    };
    const allowed = allowedFields[category] ?? [];
    if (Object.keys(attributes).some((key) => !allowed.includes(key)))
      throw new Error(
        "Use only the supported category details shown in the form.",
      );
    return attributes;
  } catch {
    throw new Error("Enter valid supported category details.");
  }
}

function parseHours(value: string, special: boolean) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed.map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : null;
      const opensAt =
        typeof record?.opensAt === "string" ? record.opensAt : null;
      const closesAt =
        typeof record?.closesAt === "string" ? record.closesAt : null;
      const isClosed = record?.isClosed === true;
      const dayOfWeek = Number(record?.dayOfWeek);
      const date = typeof record?.date === "string" ? record.date : null;
      if (
        (!special &&
          (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)) ||
        (special && !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) ||
        (!isClosed &&
          (!/^\d{2}:\d{2}$/.test(opensAt ?? "") ||
            !/^\d{2}:\d{2}$/.test(closesAt ?? "") ||
            opensAt === closesAt))
      )
        throw new Error();
      return {
        dayOfWeek,
        date,
        opensAt: isClosed ? null : opensAt,
        closesAt: isClosed ? null : closesAt,
        isClosed,
        note:
          typeof record?.note === "string" ? record.note.slice(0, 240) : null,
      };
    });
  } catch {
    throw new Error(`Enter valid ${special ? "special" : "weekly"} hours.`);
  }
}

export async function setAvailabilityBlock(input: unknown, actorId: string) {
  const parsed = availabilitySchema.parse(input);
  await assertOwnerCanManageListing(actorId, parsed.listingId);

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${parsed.listingId}))`,
    );
    if (parsed.ratePlanId) {
      const ownedRate = await tx.execute(sql`
        select 1 from rate_plans where id = ${parsed.ratePlanId}::uuid and listing_id = ${parsed.listingId}::uuid
      `);
      if (ownedRate.rows.length === 0)
        throw new Error("Rate plan does not belong to this listing.");
      await tx.execute(sql`
        insert into availability_blocks (listing_id, rate_plan_id, date, available, quantity)
        values (${parsed.listingId}::uuid, ${parsed.ratePlanId}::uuid, ${parsed.date}::date, ${parsed.available}, ${parsed.quantity})
        on conflict (listing_id, rate_plan_id, date) where rate_plan_id is not null
        do update set available = excluded.available, quantity = excluded.quantity
      `);
    } else {
      await tx.execute(sql`
        insert into availability_blocks (listing_id, rate_plan_id, date, available, quantity)
        values (${parsed.listingId}::uuid, null, ${parsed.date}::date, ${parsed.available}, ${parsed.quantity})
        on conflict (listing_id, date) where rate_plan_id is null
        do update set available = excluded.available, quantity = excluded.quantity
      `);
    }
    await tx.execute(sql`
      update rate_plans set availability_trust_status = 'owner_provided'::listing_trust_status,
        availability_verified_at = now(), availability_valid_until = now() + interval '7 days'
      where listing_id = ${parsed.listingId}::uuid
      ${parsed.ratePlanId ? sql`and id = ${parsed.ratePlanId}::uuid` : sql``}
    `);
  });

  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${actorId}::uuid,
      'availability.owner_update',
      'listing',
      ${parsed.listingId}::uuid,
      ${JSON.stringify({ date: parsed.date, ratePlanId: parsed.ratePlanId ?? null, available: parsed.available, quantity: parsed.quantity })}::jsonb
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
  const result = await db.execute<{ category: string }>(sql`
    select l.category
    from listings l
    join businesses b on b.id = l.business_id
    where l.id = ${parsedListingId}::uuid
      and b.owner_id = ${actorId}::uuid
    limit 1
  `);

  const listing = result.rows[0];
  if (!listing) {
    throw new AuthorizationError("Owner access required");
  }
  return listing.category;
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

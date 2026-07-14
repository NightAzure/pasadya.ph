import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

export const geography = customType<{
  data: string;
  driverData: string;
  config: { type: "Point" | "LineString"; srid?: number };
}>({
  dataType(config) {
    return `geography(${config?.type ?? "Point"}, ${config?.srid ?? 4326})`;
  },
});

export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const authProviderEnum = pgEnum("auth_provider", [
  "email",
  "google",
  "facebook",
]);
export const listingCategoryEnum = pgEnum("listing_category", [
  "resort",
  "room",
  "restaurant",
  "activity",
  "service",
]);
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "published",
  "closed",
  "archived",
]);
export const claimStatusEnum = pgEnum("claim_status", [
  "unclaimed",
  "pending",
  "claimed",
  "disputed",
]);
export const bookingModeEnum = pgEnum("booking_mode", [
  "inquiry",
  "instant",
  "none",
]);
export const cancellationPolicyEnum = pgEnum("cancellation_policy", [
  "flexible",
  "moderate",
  "strict",
]);
export const mediaTypeEnum = pgEnum("media_type", ["photo", "video"]);
export const amenityCategoryEnum = pgEnum("amenity_category", [
  "general",
  "room",
  "activity",
  "dining",
]);
export const ratePlanTypeEnum = pgEnum("rate_plan_type", [
  "overnight",
  "day_use",
  "entrance",
  "package",
  "hourly",
]);
export const priceUnitEnum = pgEnum("price_unit", [
  "per_night",
  "per_person",
  "per_group",
  "flat",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "draft",
  "requested",
  "accepted",
  "awaiting_payment",
  "confirmed",
  "completed",
  "declined",
  "expired",
  "cancelled_by_guest",
  "cancelled_by_owner",
  "refunded",
  "no_show",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const payoutMethodEnum = pgEnum("payout_method", [
  "gcash",
  "bank_transfer",
]);
export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "completed",
  "failed",
]);
export const claimMethodEnum = pgEnum("claim_method", [
  "phone_otp",
  "email",
  "document",
  "photo_verification",
]);
export const claimRequestStatusEnum = pgEnum("claim_request_status", [
  "pending",
  "approved",
  "rejected",
  "disputed",
  "transferred",
]);
export const moderationTypeEnum = pgEnum("moderation_type", [
  "claim",
  "review",
  "photo",
  "route_contribution",
  "listing_report",
  "listing_edit",
]);
export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
]);
export const reviewStatusEnum = pgEnum("review_status", [
  "published",
  "flagged",
  "removed",
]);
export const crowdSourceEnum = pgEnum("crowd_source", [
  "business",
  "community",
  "heuristic",
]);
export const crowdLevelEnum = pgEnum("crowd_level", [
  "quiet",
  "moderate",
  "busy",
  "full",
]);
export const transportModeEnum = pgEnum("transport_mode", [
  "jeepney",
  "bus",
  "ferry",
  "tricycle",
  "multicab",
  "habal_habal",
]);
export const transportStatusEnum = pgEnum("transport_status", [
  "draft",
  "published",
  "deprecated",
]);
export const transportSourceEnum = pgEnum("transport_source", [
  "official",
  "community",
  "seeded",
]);
export const routeContributionTypeEnum = pgEnum("route_contribution_type", [
  "new_route",
  "correction",
  "new_stop",
  "fare_update",
]);
export const contributionStatusEnum = pgEnum("contribution_status", [
  "pending",
  "approved",
  "rejected",
]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

const id = uuid("id").defaultRandom().primaryKey();
const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

export const users = pgTable(
  "users",
  {
    id,
    email: text("email"),
    phone: text("phone"),
    name: text("name"),
    image: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("user"),
    authProvider: authProviderEnum("auth_provider").notNull().default("email"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.identifier, table.token],
    }),
  ],
);

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.credentialID],
    }),
  ],
);

export const businesses = pgTable(
  "businesses",
  {
    id,
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    legalName: text("legal_name"),
    displayName: text("display_name").notNull(),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    payoutGcash: text("payout_gcash"),
    payoutBank: jsonb("payout_bank"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [index("businesses_owner_id_idx").on(table.ownerId)],
);

export const listings = pgTable(
  "listings",
  {
    id,
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: listingCategoryEnum("category").notNull(),
    description: text("description"),
    status: listingStatusEnum("status").notNull().default("draft"),
    claimStatus: claimStatusEnum("claim_status").notNull().default("unclaimed"),
    location: geography("location", { type: "Point", srid: 4326 }),
    address: jsonb("address").notNull().default({}),
    attributes: jsonb("attributes").notNull().default({}),
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
    ratingAvg: decimal("rating_avg", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    dotAccredited: boolean("dot_accredited").notNull().default(false),
    bookingMode: bookingModeEnum("booking_mode").notNull().default("inquiry"),
    cancellationPolicy: cancellationPolicyEnum("cancellation_policy")
      .notNull()
      .default("flexible"),
    downpaymentPct: integer("downpayment_pct").notNull().default(50),
    contactPhone: text("contact_phone"),
    contactFacebook: text("contact_facebook"),
    contactWebsite: text("contact_website"),
    searchVector: tsvector("search_vector"),
    createdAt,
    updatedAt,
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("listings_slug_unique").on(table.slug),
    index("listings_business_id_idx").on(table.businessId),
    index("listings_category_status_idx")
      .on(table.category, table.status)
      .where(sql`${table.status} = 'published'`),
    index("listings_price_idx").on(table.priceMin, table.priceMax),
    index("listings_location_gist_idx").using("gist", table.location),
    index("listings_search_gin_idx").using("gin", table.searchVector),
  ],
);

export const listingMedia = pgTable(
  "listing_media",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: mediaTypeEnum("type").notNull().default("photo"),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    moderated: boolean("moderated").notNull().default(false),
    createdAt,
  },
  (table) => [
    index("listing_media_listing_id_idx").on(table.listingId),
    index("listing_media_uploaded_by_idx").on(table.uploadedBy),
  ],
);

export const amenities = pgTable("amenities", {
  id,
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  category: amenityCategoryEnum("category").notNull().default("general"),
});

export const listingAmenities = pgTable(
  "listing_amenities",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    amenityId: uuid("amenity_id")
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.amenityId] }),
    index("listing_amenities_amenity_id_idx").on(table.amenityId),
  ],
);

export const ratePlans = pgTable(
  "rate_plans",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: ratePlanTypeEnum("type").notNull(),
    price: integer("price").notNull(),
    priceUnit: priceUnitEnum("price_unit").notNull(),
    maxPax: integer("max_pax"),
    minPax: integer("min_pax").notNull().default(1),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("rate_plans_listing_id_idx").on(table.listingId)],
);

export const availabilityBlocks = pgTable(
  "availability_blocks",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    ratePlanId: uuid("rate_plan_id").references(() => ratePlans.id, {
      onDelete: "cascade",
    }),
    date: date("date").notNull(),
    available: boolean("available").notNull().default(false),
    quantity: integer("quantity").notNull().default(1),
    priceOverride: integer("price_override"),
  },
  (table) => [
    uniqueIndex("availability_blocks_unique").on(
      table.listingId,
      table.ratePlanId,
      table.date,
    ),
    index("availability_blocks_listing_id_idx").on(table.listingId),
    index("availability_blocks_rate_plan_id_idx").on(table.ratePlanId),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ratePlanId: uuid("rate_plan_id").references(() => ratePlans.id, {
      onDelete: "restrict",
    }),
    status: bookingStatusEnum("status").notNull().default("draft"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    pax: integer("pax").notNull(),
    guestName: text("guest_name").notNull(),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    specialRequests: text("special_requests"),
    subtotal: integer("subtotal").notNull(),
    downpaymentAmount: integer("downpayment_amount").notNull(),
    balanceDue: integer("balance_due").notNull(),
    currency: text("currency").notNull().default("PHP"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("bookings_listing_id_idx").on(table.listingId),
    index("bookings_user_id_idx").on(table.userId),
    index("bookings_rate_plan_id_idx").on(table.ratePlanId),
    index("bookings_status_expires_at_idx").on(table.status, table.expiresAt),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id,
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "restrict" }),
    paymongoSessionId: text("paymongo_session_id").notNull().unique(),
    paymongoPaymentId: text("paymongo_payment_id"),
    amount: integer("amount").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paymentMethod: text("payment_method"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundAmount: integer("refund_amount"),
    createdAt,
  },
  (table) => [index("payments_booking_id_idx").on(table.bookingId)],
);

export const webhookEvents = pgTable("webhook_events", {
  id,
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
});

export const payouts = pgTable(
  "payouts",
  {
    id,
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    bookingIds: uuid("booking_ids").array().notNull().default([]),
    method: payoutMethodEnum("method").notNull(),
    reference: text("reference"),
    status: payoutStatusEnum("status").notNull().default("pending"),
    processedBy: uuid("processed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("payouts_business_id_idx").on(table.businessId),
    index("payouts_processed_by_idx").on(table.processedBy),
  ],
);

export const claimRequests = pgTable(
  "claim_requests",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: claimMethodEnum("method").notNull(),
    status: claimRequestStatusEnum("status").notNull().default("pending"),
    verificationData: jsonb("verification_data").notNull().default({}),
    adminNotes: text("admin_notes"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("claim_requests_listing_id_idx").on(table.listingId),
    index("claim_requests_user_id_idx").on(table.userId),
    index("claim_requests_reviewed_by_idx").on(table.reviewedBy),
  ],
);

export const moderationQueue = pgTable(
  "moderation_queue",
  {
    id,
    type: moderationTypeEnum("type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    status: moderationStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    payload: jsonb("payload").notNull().default({}),
    reviewerId: uuid("reviewer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewerNotes: text("reviewer_notes"),
    createdAt,
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("moderation_queue_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("moderation_queue_reviewer_id_idx").on(table.reviewerId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id")
      .unique()
      .references(() => bookings.id, {
        onDelete: "set null",
      }),
    rating: integer("rating").notNull(),
    subRatings: jsonb("sub_ratings").notNull().default({}),
    body: text("body").notNull(),
    verifiedStay: boolean("verified_stay").notNull().default(false),
    ownerResponse: text("owner_response"),
    ownerRespondedAt: timestamp("owner_responded_at", { withTimezone: true }),
    status: reviewStatusEnum("status").notNull().default("published"),
    createdAt,
  },
  (table) => [
    index("reviews_listing_id_idx").on(table.listingId),
    index("reviews_user_id_idx").on(table.userId),
    index("reviews_booking_id_idx").on(table.bookingId),
  ],
);

export const reviewMedia = pgTable(
  "review_media",
  {
    id,
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    caption: text("caption"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    moderated: boolean("moderated").notNull().default(false),
    createdAt,
  },
  (table) => [
    index("review_media_review_id_idx").on(table.reviewId),
    index("review_media_uploaded_by_idx").on(table.uploadedBy),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    answer: text("answer"),
    answeredBy: uuid("answered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("questions_listing_id_idx").on(table.listingId),
    index("questions_user_id_idx").on(table.userId),
    index("questions_answered_by_idx").on(table.answeredBy),
  ],
);

export const crowdReports = pgTable(
  "crowd_reports",
  {
    id,
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    source: crowdSourceEnum("source").notNull(),
    level: crowdLevelEnum("level").notNull(),
    reporterLocation: geography("reporter_location", {
      type: "Point",
      srid: 4326,
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("crowd_reports_listing_id_idx").on(table.listingId),
    index("crowd_reports_user_id_idx").on(table.userId),
    index("crowd_reports_reporter_location_gist_idx").using(
      "gist",
      table.reporterLocation,
    ),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
    index("favorites_listing_id_idx").on(table.listingId),
  ],
);

export const transportRoutes = pgTable(
  "transport_routes",
  {
    id,
    name: text("name").notNull(),
    code: text("code"),
    mode: transportModeEnum("mode").notNull(),
    description: text("description"),
    geometry: geography("geometry", { type: "LineString", srid: 4326 }),
    fareMin: integer("fare_min"),
    fareMax: integer("fare_max"),
    operatingHours: jsonb("operating_hours").notNull().default({}),
    status: transportStatusEnum("status").notNull().default("draft"),
    source: transportSourceEnum("source").notNull().default("seeded"),
    contributorId: uuid("contributor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("transport_routes_status_mode_idx").on(table.status, table.mode),
    index("transport_routes_contributor_id_idx").on(table.contributorId),
    index("transport_routes_geometry_gist_idx").using("gist", table.geometry),
  ],
);

export const routeStops = pgTable(
  "route_stops",
  {
    id,
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: geography("location", { type: "Point", srid: 4326 }).notNull(),
    stopOrder: integer("stop_order").notNull(),
    isTerminal: boolean("is_terminal").notNull().default(false),
  },
  (table) => [
    index("route_stops_route_id_idx").on(table.routeId),
    index("route_stops_location_gist_idx").using("gist", table.location),
  ],
);

export const routeSegments = pgTable(
  "route_segments",
  {
    id,
    fromRouteId: uuid("from_route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    toRouteId: uuid("to_route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    transferStopId: uuid("transfer_stop_id").references(() => routeStops.id, {
      onDelete: "set null",
    }),
    transferNotes: text("transfer_notes"),
    walkingDistanceM: integer("walking_distance_m"),
  },
  (table) => [
    index("route_segments_from_route_id_idx").on(table.fromRouteId),
    index("route_segments_to_route_id_idx").on(table.toRouteId),
    index("route_segments_transfer_stop_id_idx").on(table.transferStopId),
  ],
);

export const ferrySchedules = pgTable("ferry_schedules", {
  id,
  routeName: text("route_name").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  originLocation: geography("origin_location", {
    type: "Point",
    srid: 4326,
  }).notNull(),
  destLocation: geography("dest_location", {
    type: "Point",
    srid: 4326,
  }).notNull(),
  departureTimes: time("departure_times").array().notNull().default([]),
  durationMinutes: integer("duration_minutes"),
  fare: integer("fare"),
  operator: text("operator"),
  notes: text("notes"),
  daysOfWeek: integer("days_of_week").array().notNull().default([]),
});

export const routeContributions = pgTable(
  "route_contributions",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: routeContributionTypeEnum("type").notNull(),
    data: jsonb("data").notNull(),
    status: contributionStatusEnum("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resultingRouteId: uuid("resulting_route_id").references(
      () => transportRoutes.id,
      { onDelete: "set null" },
    ),
    createdAt,
  },
  (table) => [
    index("route_contributions_user_id_idx").on(table.userId),
    index("route_contributions_reviewed_by_idx").on(table.reviewedBy),
    index("route_contributions_resulting_route_id_idx").on(
      table.resultingRouteId,
    ),
  ],
);

export const collections = pgTable("collections", {
  id,
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  listingIds: uuid("listing_ids").array().notNull().default([]),
  published: boolean("published").notNull().default(false),
  createdAt,
});

export const notifications = pgTable(
  "notifications",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").notNull().default({}),
    read: boolean("read").notNull().default(false),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("notifications_user_id_read_idx").on(table.userId, table.read),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id,
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: jobStatusEnum("status").notNull().default("pending"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => [
    index("jobs_status_scheduled_at_idx").on(table.status, table.scheduledAt),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id,
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    changes: jsonb("changes").notNull().default({}),
    createdAt,
  },
  (table) => [index("audit_log_actor_id_idx").on(table.actorId)],
);

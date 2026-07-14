export const moderationTypes = [
  "claim",
  "review",
  "photo",
  "route_contribution",
  "listing_report",
  "listing_edit",
] as const;

export type ModerationType = (typeof moderationTypes)[number];
export type ModerationDecision = "approve" | "reject";
export type AdminRole = "moderator" | "admin";

export type AdminActor = {
  id: string;
  email: string | null;
  name: string | null;
  role: "moderator" | "admin";
  isDevFallback: boolean;
};

export type ClaimModerationDetails = {
  kind: "claim";
  claimId: string;
  listingId: string;
  listingName: string | null;
  listingSlug: string | null;
  claimantId: string | null;
  claimantName: string | null;
  claimantEmail: string | null;
  method: string | null;
  claimStatus: string | null;
  verificationData: Record<string, unknown>;
};

export type ReviewModerationDetails = {
  kind: "review";
  reviewId: string;
  listingId: string;
  listingName: string | null;
  listingSlug: string | null;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  rating: number | null;
  body: string | null;
  reviewStatus: string | null;
};

export type PhotoModerationDetails = {
  kind: "photo";
  mediaId: string;
  mediaKind: "listing" | "review";
  listingId: string | null;
  listingName: string | null;
  listingSlug: string | null;
  reviewId: string | null;
  url: string | null;
  caption: string | null;
  uploadedBy: string | null;
  moderated: boolean | null;
};

export type RouteContributionModerationDetails = {
  kind: "route_contribution";
  contributionId: string;
  contributorId: string | null;
  contributorName: string | null;
  contributorEmail: string | null;
  contributionType: string | null;
  contributionStatus: string | null;
  data: Record<string, unknown>;
};

export type ListingModerationDetails = {
  kind: "listing_report" | "listing_edit";
  listingId: string;
  listingName: string | null;
  listingSlug: string | null;
  listingStatus: string | null;
  claimStatus: string | null;
  businessName: string | null;
  description: string | null;
  address: Record<string, unknown>;
  attributes: Record<string, unknown>;
  priceMin: number | null;
  priceMax: number | null;
  bookingMode: string | null;
  cancellationPolicy: string | null;
  downpaymentPct: number | null;
  contactPhone: string | null;
  contactFacebook: string | null;
  contactWebsite: string | null;
  payload: Record<string, unknown>;
};

export type ModerationDetails =
  | ClaimModerationDetails
  | ReviewModerationDetails
  | PhotoModerationDetails
  | RouteContributionModerationDetails
  | ListingModerationDetails;

export type ModerationItem = {
  queueId: string;
  type: ModerationType;
  referenceId: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  reviewerId: string | null;
  reviewerNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  details: ModerationDetails | null;
};

export type AdminListing = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  status: string;
  businessId: string | null;
  businessName: string | null;
  claimStatus: string;
  address: Record<string, unknown>;
  priceMin: number | null;
  priceMax: number | null;
  bookingMode: string;
  contactPhone: string | null;
  contactFacebook: string | null;
  contactWebsite: string | null;
  mediaCount: number;
  bookingCount: number;
  publishedAt: Date | null;
  updatedAt: Date;
};

export type BookingOversightRow = {
  id: string;
  listingId: string;
  listingName: string;
  businessId: string | null;
  businessName: string | null;
  guestName: string;
  guestEmail: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  subtotal: number;
  downpaymentAmount: number;
  balanceDue: number;
  currency: string;
  paymentStatus: string | null;
  paymentAmount: number | null;
  payoutStatus: string | null;
  payoutEligible: boolean;
  payoutEligibilityReason: string;
  createdAt: Date;
};

export type PayoutEligibilitySummary = {
  eligibleBookingCount: number;
  eligibleAmount: number;
  completedPaidBookingCount: number;
  completedPaidAmount: number;
  alreadyPayoutBookingCount: number;
  pendingPaymentBookingCount: number;
};

export type AdminMetrics = {
  totalListings: number;
  publishedListings: number;
  pendingModeration: number;
  pendingClaims: number;
  pendingRouteContributions: number;
  pendingListingReports: number;
  bookingsTotal: number;
  bookingsThisMonth: number;
  completedBookings: number;
  paidGmv: number;
  payoutEligibleAmount: number;
  queueByType: Record<ModerationType, number>;
};

export type AdminRoute = {
  id: string;
  name: string;
  mode: string;
  status: string;
  source: string;
  stopCount: number;
  updatedAt: Date;
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
};

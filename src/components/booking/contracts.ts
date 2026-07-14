export const bookingStatuses = [
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
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export type BookingMode = "inquiry" | "instant";

export type BookingSummary = {
  id: string;
  listingId: string;
  listingName: string;
  listingSlug?: string | null;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  pax: number;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  ratePlanName: string;
  subtotal: number;
  downpaymentAmount: number;
  balanceDue: number;
  currency: string;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  paymentStatus?:
    "pending" | "paid" | "failed" | "refunded" | "partially_refunded" | null;
  checkoutUrl?: string | null;
};

export type OwnerBookingSummary = BookingSummary & {
  ownerNote?: string | null;
};

export type PayoutSummary = {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  bookingIds: string[];
  method: "gcash" | "bank_transfer";
  reference?: string | null;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  processedAt?: string | null;
};

export type BookingFormListing = {
  id: string;
  slug: string;
  name: string;
  bookingMode: BookingMode | "none";
  cancellationPolicy: "flexible" | "moderate" | "strict";
  downpaymentPct: number;
  ratePlans: Array<{
    id: string;
    name: string;
    type: string;
    price: number;
    priceUnit: string;
    description: string | null;
  }>;
};

export function formatBookingMoney(amount: number, currency = "PHP") {
  return `${currency === "PHP" ? "₱" : currency + " "}${(
    amount / 100
  ).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

export function bookingStatusLabel(status: BookingStatus) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(status: BookingStatus) {
  if (["confirmed", "completed"].includes(status)) return "success";
  if (
    [
      "declined",
      "expired",
      "cancelled_by_guest",
      "cancelled_by_owner",
      "refunded",
      "no_show",
    ].includes(status)
  )
    return "error";
  if (["requested", "accepted", "awaiting_payment"].includes(status))
    return "warning";
  return "neutral";
}

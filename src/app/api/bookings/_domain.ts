import type {
  BookingSummary,
  OwnerBookingSummary,
} from "@/components/booking/contracts";
import {
  acceptBooking,
  createBooking as createBookingDomain,
  declineBooking,
  getBookingForActor as getBookingForActorDomain,
  listBookingsForActor as listBookingsForActorDomain,
  listOwnerBookings as listOwnerBookingsDomain,
  type BookingView,
} from "@/modules/bookings";

export type CreateBookingInput = {
  listingId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  requestedUnits?: number;
  durationHours?: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests?: string;
};

export type BookingDomain = {
  createBooking: (
    input: CreateBookingInput,
    actorId: string,
  ) => Promise<{
    bookingId: string;
    status: BookingSummary["status"];
    checkoutUrl?: string | null;
  }>;
  getBookingForActor: (
    bookingId: string,
    actorId: string,
  ) => Promise<BookingSummary | null>;
  listBookingsForActor: (actorId: string) => Promise<BookingSummary[]>;
  listOwnerBookings: (actorId: string) => Promise<OwnerBookingSummary[]>;
  acceptBooking: (
    bookingId: string,
    actorId: string,
  ) => Promise<BookingSummary>;
  declineBooking: (
    bookingId: string,
    actorId: string,
    reason?: string,
  ) => Promise<BookingSummary>;
};

/**
 * Typed adapter for route/page consumers. Authorization remains in the domain
 * service; this file only normalizes the view contract used by the UI.
 */
export async function getBookingDomain(): Promise<Partial<BookingDomain>> {
  return {
    createBooking: async (input, actorId) => {
      return createBookingDomain(input, actorId);
    },
    getBookingForActor: async (bookingId, actorId) => {
      const booking = await getBookingForActorDomain(bookingId, actorId);
      return booking ? toBookingSummary(booking) : null;
    },
    listBookingsForActor: async (actorId) =>
      (await listBookingsForActorDomain(actorId)).map(toBookingSummary),
    listOwnerBookings: async (actorId) =>
      (await listOwnerBookingsDomain(actorId)).map(toBookingSummary),
    acceptBooking: async (bookingId, actorId) =>
      toBookingSummary(await acceptBooking(bookingId, actorId)),
    declineBooking: async (bookingId, actorId, reason) =>
      toBookingSummary(await declineBooking(bookingId, actorId, reason)),
  };
}

export function toBookingSummary(view: BookingView): BookingSummary {
  return {
    ...view,
    expiresAt: asIso(view.expiresAt),
    confirmedAt: asIso(view.confirmedAt),
    paymentStatus: view.paymentStatus,
  };
}

function asIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function domainUnavailable() {
  return {
    error: "Booking service is not available in this checkout yet.",
    code: "BOOKING_DOMAIN_MISSING",
  } as const;
}

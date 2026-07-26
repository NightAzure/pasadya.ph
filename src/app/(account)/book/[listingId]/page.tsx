import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { BookingForm } from "@/components/booking/booking-form";
import type { BookingFormListing } from "@/components/booking/contracts";
import { Button } from "@/components/ui/button";
import {
  formatAddress,
  formatPrice,
  getListingBySlug,
} from "@/modules/listings/search";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { listingId } = await params;
  const listing = await getListingBySlug(listingId);
  if (!listing) notFound();
  const query = (await searchParams) ?? {};
  const error = first(query.error);
  const initialQuote = quotePrefillFromParams(
    query,
    listing.ratePlans.map((rate) => rate.id),
  );

  if (listing.bookingMode === "none") {
    return (
      <main
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8"
        id="main-content"
      >
        <Button asChild className="mb-5" variant="ghost">
          <Link href={`/place/${listing.slug}`}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to listing
          </Link>
        </Button>
        <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-primary">
            Booking unavailable
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{listing.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This listing is not accepting online bookings right now. Check the
            public listing for contact details and availability.
          </p>
          <Button asChild className="mt-5">
            <Link href={`/place/${listing.slug}`}>View listing</Link>
          </Button>
        </section>
      </main>
    );
  }

  const formListing: BookingFormListing = {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    bookingMode: listing.bookingMode,
    cancellationPolicy: listing.cancellationPolicy,
    downpaymentPct: listing.downpaymentPct,
    ratePlans: listing.ratePlans,
  };

  return (
    <main
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <Button asChild className="mb-5" variant="ghost">
        <Link href={`/place/${listing.slug}`}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to listing
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <p className="text-sm font-medium text-primary">
            {listing.bookingMode === "instant"
              ? "Instant booking"
              : "Booking inquiry"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            Book {listing.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatAddress(listing.address)} · from{" "}
            {formatPrice(listing.priceMin)}
          </p>
          {error ? (
            <div
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
              role="alert"
            >
              {error === "booking-domain-unavailable"
                ? "Booking is temporarily unavailable while the booking service is being connected. Your dates were not held."
                : "Please review your booking details and try again."}
            </div>
          ) : null}
          <div className="mt-5">
            <BookingForm initialQuote={initialQuote} listing={formListing} />
          </div>
        </section>
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BadgeCheck aria-hidden="true" className="h-5 w-5 text-success" />{" "}
              Booking with confidence
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>
                Secure hosted checkout supports GCash, Maya, cards, and QR Ph.
              </li>
              <li>
                Your booking is confirmed only after payment verification.
              </li>
              <li>The remaining balance is paid directly at the venue.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function quotePrefillFromParams(
  params: Record<string, string | string[] | undefined>,
  ratePlanIds: string[],
) {
  const ratePlanId = first(params.ratePlanId);
  const checkIn = first(params.checkIn);
  const checkOut = first(params.checkOut);
  const pax = positiveInteger(first(params.pax));
  const requestedUnits = positiveInteger(first(params.requestedUnits));
  const durationHours = positiveInteger(first(params.durationHours));
  if (
    !ratePlanId ||
    !ratePlanIds.includes(ratePlanId) ||
    !validDate(checkIn) ||
    !validDate(checkOut) ||
    !pax ||
    !requestedUnits
  )
    return undefined;
  return {
    ratePlanId,
    checkIn,
    checkOut,
    pax,
    requestedUnits,
    ...(durationHours ? { durationHours } : {}),
  };
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function positiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 999
    ? parsed
    : undefined;
}

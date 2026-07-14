import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, CreditCard } from "lucide-react";
import { notFound } from "next/navigation";

import {
  BookingStatusBadge,
  PaymentReturnNotice,
} from "@/components/booking/booking-status";
import {
  formatBookingMoney,
  bookingStatusLabel,
} from "@/components/booking/contracts";
import { Button } from "@/components/ui/button";
import { getBookingDomain } from "@/app/api/bookings/_domain";
import { getPortalActor } from "@/modules/portal/service";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor();
  const { bookingId } = await params;
  const query = (await searchParams) ?? {};
  const domain = await getBookingDomain();
  if (!domain?.getBookingForActor) {
    return <UnavailableDetail />;
  }
  const booking = await domain.getBookingForActor(bookingId, actor.id);
  if (!booking) notFound();
  const isConfirmation =
    first(query.confirmed) === "1" || booking.status === "confirmed";
  const canPay =
    booking.status === "accepted" || booking.status === "awaiting_payment";

  return (
    <main
      className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <Button asChild className="mb-5" variant="ghost">
        <Link href="/account/bookings">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All bookings
        </Link>
      </Button>
      <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-7">
        <PaymentReturnNotice result={first(query.payment)} />
        {isConfirmation ? (
          <div
            className="mb-5 flex items-center gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
            Your booking details are below. Payment confirmation is based on the
            verified payment webhook.
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Booking {booking.id.slice(0, 8).toUpperCase()}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {booking.listingName}
            </h1>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info
            label="Dates"
            value={`${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)}`}
          />
          <Info label="Guests" value={`${booking.pax}`} />
          <Info label="Rate plan" value={booking.ratePlanName} />
          <Info label="Guest" value={booking.guestName} />
          <Info
            label="Total"
            value={formatBookingMoney(booking.subtotal, booking.currency)}
          />
          <Info
            label="Balance at venue"
            value={formatBookingMoney(booking.balanceDue, booking.currency)}
          />
        </dl>
        {booking.status === "awaiting_payment" ? (
          <div className="mt-6 flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
            <Clock3
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
            />
            <p>
              <span className="font-semibold">Payment needed.</span> Your dates
              are not confirmed until the downpayment is paid and the payment
              webhook is verified.{" "}
              {booking.expiresAt
                ? `Payment window ends ${formatDateTime(booking.expiresAt)}.`
                : ""}
            </p>
          </div>
        ) : null}
        {canPay ? (
          <Button asChild className="mt-5 w-full" size="lg">
            <a href={`/api/bookings/${booking.id}/checkout`}>
              <CreditCard aria-hidden="true" className="h-5 w-5" /> Pay{" "}
              {formatBookingMoney(booking.downpaymentAmount, booking.currency)}{" "}
              downpayment
            </a>
          </Button>
        ) : null}
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Status: {bookingStatusLabel(booking.status)}. Keep this page for your
          records; redirecting back from a payment provider does not by itself
          confirm a booking.
        </p>
      </section>
    </main>
  );
}

function UnavailableDetail() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6" id="main-content">
      <section
        className="rounded-lg border border-warning/40 bg-warning/10 p-5"
        role="status"
      >
        <h1 className="text-xl font-semibold">Booking service unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This booking detail will load when the Phase 05 booking domain is
          connected. No payment state is inferred from the URL.
        </p>
        <Button asChild className="mt-5" variant="secondary">
          <Link href="/account/bookings">Back to bookings</Link>
        </Button>
      </section>
    </main>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

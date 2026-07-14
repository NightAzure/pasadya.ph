import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BookingStatusBadge } from "@/components/booking/booking-status";
import { formatBookingMoney } from "@/components/booking/contracts";
import { Button } from "@/components/ui/button";
import { getBookingDomain } from "@/app/api/bookings/_domain";
import { getPortalActor } from "@/modules/portal/service";

export default async function OwnerBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const actor = await getPortalActor();
  const { bookingId } = await params;
  const domain = await getBookingDomain();
  const booking = domain?.getBookingForActor
    ? await domain.getBookingForActor(bookingId, actor.id)
    : null;
  if (!booking && !domain) return <Unavailable />;
  if (!booking)
    return (
      <Unavailable message="This booking is not available to your account." />
    );
  const canReview = booking.status === "requested";
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <Button asChild className="mb-5" variant="ghost">
        <Link href="/portal/bookings">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Booking requests
        </Link>
      </Button>
      <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Guest booking</p>
            <h1 className="mt-1 text-2xl font-semibold">
              {booking.listingName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.guestName} · {booking.guestEmail}
            </p>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info
            label="Dates"
            value={`${booking.checkIn} – ${booking.checkOut}`}
          />
          <Info label="Guests" value={`${booking.pax}`} />
          <Info label="Rate plan" value={booking.ratePlanName} />
          <Info
            label="Total"
            value={formatBookingMoney(booking.subtotal, booking.currency)}
          />
          <Info
            label="Downpayment"
            value={formatBookingMoney(
              booking.downpaymentAmount,
              booking.currency,
            )}
          />
          <Info
            label="Balance at venue"
            value={formatBookingMoney(booking.balanceDue, booking.currency)}
          />
        </dl>
        {canReview ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <form action={`/api/bookings/${booking.id}/actions`} method="post">
              <input name="action" type="hidden" value="accept" />
              <Button className="w-full" size="lg" type="submit">
                Accept booking
              </Button>
            </form>
            <form
              action={`/api/bookings/${booking.id}/actions`}
              className="space-y-2"
              method="post"
            >
              <input name="action" type="hidden" value="decline" />
              <label className="text-sm font-medium" htmlFor="decline-reason">
                Reason for declining (optional)
              </label>
              <input
                className="min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="decline-reason"
                name="reason"
              />
              <Button
                className="w-full"
                size="lg"
                type="submit"
                variant="destructive"
              >
                Decline booking
              </Button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Unavailable({
  message = "The typed Phase 05 booking service is not present in this checkout yet.",
}: {
  message?: string;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6" id="main-content">
      <section
        className="rounded-lg border border-warning/40 bg-warning/10 p-5"
        role="status"
      >
        <h1 className="text-xl font-semibold">Booking service unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {message} No owner action was applied.
        </p>
        <Button asChild className="mt-5" variant="secondary">
          <Link href="/portal/bookings">Back to requests</Link>
        </Button>
      </section>
    </main>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
    </div>
  );
}

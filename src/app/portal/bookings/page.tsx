import Link from "next/link";
import { CalendarDays, Check, X } from "lucide-react";

import { BookingStatusBadge } from "@/components/booking/booking-status";
import {
  formatBookingMoney,
  type OwnerBookingSummary,
} from "@/components/booking/contracts";
import { Button } from "@/components/ui/button";
import { getBookingDomain } from "@/app/api/bookings/_domain";
import { getPortalActor } from "@/modules/portal/service";

export default async function PortalBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor();
  const params = (await searchParams) ?? {};
  const domain = await getBookingDomain();
  const bookings = domain?.listOwnerBookings
    ? await domain.listOwnerBookings(actor.id)
    : null;

  return (
    <main
      className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Business portal</p>
          <h1 className="mt-1 text-2xl font-semibold">Booking requests</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review dates and guest details, then accept or decline requests in
            plain language.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/portal">Back to dashboard</Link>
        </Button>
      </div>
      {first(params.updated) ? (
        <div
          className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm"
          role="status"
        >
          Booking status updated. The guest will see the latest state in their
          trips.
        </div>
      ) : null}
      {bookings === null ? (
        <Unavailable />
      ) : bookings.length === 0 ? (
        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">No booking requests</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            New inquiries and instant bookings will appear here. Keep your
            availability up to date so guests see an honest calendar.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <OwnerBookingCard booking={booking} key={booking.id} />
          ))}
        </div>
      )}
    </main>
  );
}

function OwnerBookingCard({ booking }: { booking: OwnerBookingSummary }) {
  const canReview = booking.status === "requested";
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {booking.guestName}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{booking.listingName}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} ·{" "}
            {booking.pax} {booking.pax === 1 ? "guest" : "guests"}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <Info
          label="Guest email"
          value={booking.guestEmail ?? "Not provided"}
        />
        <Info
          label="Guest phone"
          value={booking.guestPhone ?? "Not provided"}
        />
        <Info label="Rate" value={booking.ratePlanName} />
        <Info
          label="Total"
          value={formatBookingMoney(booking.subtotal, booking.currency)}
        />
      </dl>
      {booking.ownerNote ? (
        <p className="mt-4 rounded-md bg-muted/50 p-3 text-sm leading-6">
          {booking.ownerNote}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Button asChild variant="outline">
          <Link href={`/portal/bookings/${booking.id}`}>Open details</Link>
        </Button>
        {canReview ? (
          <>
            <form action={`/api/bookings/${booking.id}/actions`} method="post">
              <input name="action" type="hidden" value="accept" />
              <Button className="w-full sm:w-auto" type="submit">
                <Check aria-hidden="true" className="h-4 w-4" /> Accept booking
              </Button>
            </form>
            <form
              action={`/api/bookings/${booking.id}/actions`}
              className="flex flex-1 gap-2"
              method="post"
            >
              <input name="action" type="hidden" value="decline" />
              <label className="sr-only" htmlFor={`reason-${booking.id}`}>
                Reason for declining
              </label>
              <input
                className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id={`reason-${booking.id}`}
                maxLength={700}
                name="reason"
                placeholder="Reason (optional)"
              />
              <Button type="submit" variant="destructive">
                <X aria-hidden="true" className="h-4 w-4" /> Decline
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </article>
  );
}

function Unavailable() {
  return (
    <section
      className="rounded-lg border border-warning/40 bg-warning/10 p-5 text-sm leading-6"
      role="status"
    >
      <h2 className="font-semibold">Booking service unavailable</h2>
      <p className="mt-1 text-muted-foreground">
        The owner queue is ready, but the typed Phase 05 booking service is not
        present in this checkout. No request was accepted or declined.
      </p>
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
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
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

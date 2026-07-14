import Link from "next/link";

import {
  BookingCard,
  PaymentReturnNotice,
} from "@/components/booking/booking-status";
import { Button } from "@/components/ui/button";
import { getPortalActor } from "@/modules/portal/service";
import { getBookingDomain } from "@/app/api/bookings/_domain";

export default async function AccountBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor();
  const params = (await searchParams) ?? {};
  const domain = await getBookingDomain();
  const bookings = domain?.listBookingsForActor
    ? await domain.listBookingsForActor(actor.id)
    : null;

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Your trips</p>
          <h1 className="mt-1 text-2xl font-semibold">Bookings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep your booking details and payment status in one place.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/search">Find a place</Link>
        </Button>
      </div>
      <PaymentReturnNotice result={first(params.payment)} />
      {bookings === null ? (
        <UnavailableState message="Your booking history is waiting for the Phase 05 booking service to be connected. No booking was created or confirmed from this page." />
      ) : bookings.length === 0 ? (
        <section className="rounded-lg border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold">No bookings yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            When you request or pay for a stay, it will appear here with the
            latest status.
          </p>
          <Button asChild className="mt-5">
            <Link href="/search">Explore stays</Link>
          </Button>
        </section>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <BookingCard booking={booking} key={booking.id} />
          ))}
        </div>
      )}
    </main>
  );
}

function UnavailableState({ message }: { message: string }) {
  return (
    <section
      className="rounded-lg border border-warning/40 bg-warning/10 p-5 text-sm leading-6"
      role="status"
    >
      <h2 className="font-semibold">Booking service unavailable</h2>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </section>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

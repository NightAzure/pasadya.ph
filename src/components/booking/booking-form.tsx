import Link from "next/link";
import { CalendarDays, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatBookingMoney,
  type BookingFormListing,
} from "@/components/booking/contracts";

export function BookingForm({ listing }: { listing: BookingFormListing }) {
  const firstPlan = listing.ratePlans[0];
  const isInstant = listing.bookingMode === "instant";
  const downpaymentPct = listing.downpaymentPct ?? 50;

  return (
    <form
      action="/api/bookings"
      className="space-y-6 rounded-lg border bg-card p-4 shadow-sm sm:p-6"
      method="post"
    >
      <input name="listingId" type="hidden" value={listing.id} />
      <input name="listingSlug" type="hidden" value={listing.slug} />

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Your stay</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            autoComplete="off"
            label="Check-in"
            name="checkIn"
            required
            type="date"
          />
          <Field
            autoComplete="off"
            label="Check-out"
            name="checkOut"
            required
            type="date"
          />
          <Field
            defaultValue="2"
            inputMode="numeric"
            label="Guests"
            min="1"
            name="pax"
            required
            type="number"
          />
          <label className="block">
            <span className="text-sm font-medium">Rate plan</span>
            <select
              className="mt-2 min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue={firstPlan?.name ?? ""}
              name="ratePlanName"
              required
            >
              {listing.ratePlans.length === 0 ? (
                <option value="">Owner has not published a rate yet</option>
              ) : (
                listing.ratePlans.map((plan) => (
                  <option key={`${plan.name}-${plan.type}`} value={plan.name}>
                    {plan.name} · {formatBookingMoney(plan.price)}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Guest details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            autoComplete="name"
            label="Full name"
            name="guestName"
            required
            type="text"
          />
          <Field
            autoComplete="tel"
            inputMode="tel"
            label="Phone number"
            name="guestPhone"
            required
            type="tel"
          />
          <Field
            autoComplete="email"
            label="Email address"
            name="guestEmail"
            required
            type="email"
          />
        </div>
        <label className="block">
          <span className="text-sm font-medium">
            Special requests{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={700}
            name="specialRequests"
            placeholder="Arrival time, accessibility needs, or other notes"
          />
        </label>
      </fieldset>

      <section
        aria-labelledby="booking-policy"
        className="rounded-md border bg-muted/40 p-4"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          />
          <div>
            <h2 className="text-sm font-semibold" id="booking-policy">
              Before you send this
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {isInstant
                ? `Instant booking goes to secure hosted checkout. The booking is confirmed only after payment is verified. A ${downpaymentPct}% downpayment is collected; the balance is paid at the venue.`
                : `This is an inquiry. The owner reviews your dates before payment. If accepted, you will get a secure payment link for the ${downpaymentPct}% downpayment.`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Cancellation policy: {listing.cancellationPolicy}.
            </p>
          </div>
        </div>
      </section>

      <Button
        className="w-full"
        disabled={listing.ratePlans.length === 0}
        size="lg"
        type="submit"
      >
        {isInstant ? "Continue to secure payment" : "Send booking inquiry"}
      </Button>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        Dates are held only when the booking status says so.
      </p>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <Users aria-hidden="true" className="h-4 w-4" />
        Need help first?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`/place/${listing.slug}`}
        >
          Return to the listing
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  autoComplete,
  defaultValue,
  inputMode,
  label,
  min,
  name,
  required,
  type,
}: {
  autoComplete?: string;
  defaultValue?: string;
  inputMode?: "numeric" | "tel";
  label: string;
  min?: string;
  name: string;
  required?: boolean;
  type: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        autoComplete={autoComplete}
        className="mt-2 min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        defaultValue={defaultValue}
        inputMode={inputMode}
        min={min}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

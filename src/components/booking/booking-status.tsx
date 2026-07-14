import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  bookingStatusLabel,
  formatBookingMoney,
  statusTone,
  type BookingSummary,
} from "@/components/booking/contracts";

export function BookingStatusBadge({
  status,
}: {
  status: BookingSummary["status"];
}) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-sm border px-2 text-xs font-semibold ${
        tone === "success"
          ? "border-success/30 bg-success/10 text-foreground"
          : tone === "error"
            ? "border-destructive/30 bg-destructive/10 text-foreground"
            : tone === "warning"
              ? "border-warning/40 bg-warning/10 text-foreground"
              : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {bookingStatusLabel(status)}
    </span>
  );
}

export function BookingCard({ booking }: { booking: BookingSummary }) {
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {bookingStatusLabel(booking.status)}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{booking.listingName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} ·{" "}
            {booking.pax} {booking.pax === 1 ? "guest" : "guests"}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Summary label="Rate" value={booking.ratePlanName} />
        <Summary
          label="Downpayment"
          value={formatBookingMoney(
            booking.downpaymentAmount,
            booking.currency,
          )}
        />
        <Summary
          label="Booking code"
          value={booking.id.slice(0, 8).toUpperCase()}
        />
      </dl>
      <Button asChild className="mt-4 w-full sm:w-auto" variant="secondary">
        <Link href={`/account/bookings/${booking.id}`}>View booking</Link>
      </Button>
    </article>
  );
}

export function PaymentReturnNotice({ result }: { result?: string }) {
  if (!result) return null;
  const isSuccess = result === "paid";
  const isPending = result === "pending" || result === "return";
  return (
    <div
      className={`mb-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        isSuccess
          ? "border-success/30 bg-success/10"
          : isPending
            ? "border-warning/40 bg-warning/10"
            : "border-destructive/30 bg-destructive/10"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      {isSuccess ? (
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-success"
        />
      ) : isPending ? (
        <Clock3
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-warning"
        />
      ) : (
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
        />
      )}
      <p>
        {isSuccess
          ? "Payment received. Your booking will show as confirmed after the payment webhook is verified."
          : isPending
            ? "Payment is still being verified. Do not pay again; refresh this page in a moment."
            : "We could not confirm the payment return. Your booking was not marked paid. Please contact support if you were charged."}
      </p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
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

export const paymentIcon = CreditCard;

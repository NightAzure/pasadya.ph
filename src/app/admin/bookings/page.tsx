import {
  getAdminActor,
  listBookingOversight,
  getPayoutEligibilitySummary,
} from "@/modules/admin";
import { Button } from "@/components/ui/button";
import { AdminHeader, AdminNav } from "../_components";
import { manageBookingAction } from "../actions";

export default async function AdminBookingsPage() {
  await getAdminActor("moderator");
  const [bookings, eligibility] = await Promise.all([
    listBookingOversight(),
    getPayoutEligibilitySummary(),
  ]);
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Booking oversight"
        description="Monitor booking states, capture dispute notes, cancel bookings, and request refunds with audit logging."
      />
      <AdminNav active="bookings" />
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Summary
          label="Payout eligible"
          value={`${eligibility.eligibleBookingCount} · ${php(eligibility.eligibleAmount)}`}
        />
        <Summary
          label="Completed and paid"
          value={`${eligibility.completedPaidBookingCount} · ${php(eligibility.completedPaidAmount)}`}
        />
        <Summary
          label="Awaiting payment"
          value={String(eligibility.pendingPaymentBookingCount)}
        />
      </section>
      <section className="grid gap-3">
        {bookings.length === 0 ? (
          <Empty text="No bookings are available for oversight yet." />
        ) : (
          bookings.map((booking) => (
            <article
              className="rounded-lg border bg-card p-4 shadow-sm"
              key={booking.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    {booking.status.replaceAll("_", " ")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {booking.listingName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.guestName} · {booking.checkIn} to{" "}
                    {booking.checkOut}
                  </p>
                </div>
                <span
                  className={`inline-flex min-h-8 items-center rounded-md border px-2 text-xs font-semibold ${booking.payoutEligible ? "border-success/40 bg-success/10" : "bg-muted"}`}
                >
                  {booking.payoutEligible
                    ? "Payout eligible"
                    : booking.payoutEligibilityReason}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <Info
                  label="Guest payment"
                  value={booking.paymentStatus ?? "No payment"}
                />
                <Info
                  label="Downpayment"
                  value={php(booking.downpaymentAmount)}
                />
                <Info
                  label="Business"
                  value={booking.businessName ?? "Unclaimed listing"}
                />
                <Info label="Booking ID" value={booking.id} />
              </dl>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <form
                  action={manageBookingAction}
                  className="rounded-md border bg-background p-3"
                >
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="action" type="hidden" value="dispute_note" />
                  <label className="grid gap-1 text-sm">
                    <span>Dispute note</span>
                    <textarea
                      className="min-h-20 rounded-md border bg-card px-3 py-2"
                      name="reason"
                      required
                    />
                  </label>
                  <Button
                    className="mt-3 min-h-11 w-full"
                    type="submit"
                    variant="ghost"
                  >
                    Save dispute note
                  </Button>
                </form>
                <form
                  action={manageBookingAction}
                  className="rounded-md border bg-background p-3"
                >
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="action" type="hidden" value="cancel" />
                  <label className="grid gap-1 text-sm">
                    <span>Cancel reason</span>
                    <textarea
                      className="min-h-20 rounded-md border bg-card px-3 py-2"
                      name="reason"
                      required
                    />
                  </label>
                  <Button
                    className="mt-3 min-h-11 w-full"
                    type="submit"
                    variant="destructive"
                  >
                    Cancel booking
                  </Button>
                </form>
                <form
                  action={manageBookingAction}
                  className="rounded-md border bg-background p-3"
                >
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="action" type="hidden" value="refund" />
                  <label className="grid gap-1 text-sm">
                    <span>Refund reason</span>
                    <textarea
                      className="min-h-16 rounded-md border bg-card px-3 py-2"
                      name="reason"
                      required
                    />
                  </label>
                  <label className="mt-2 grid gap-1 text-sm">
                    <span>Amount (centavos, optional)</span>
                    <input
                      className="min-h-11 rounded-md border bg-card px-3"
                      name="refundAmount"
                      type="number"
                      min={1}
                    />
                  </label>
                  <Button
                    className="mt-3 min-h-11 w-full"
                    type="submit"
                    variant="secondary"
                  >
                    Request refund
                  </Button>
                </form>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
function php(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

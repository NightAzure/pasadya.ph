import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation policy",
  description: "MVP draft cancellation policy for Pasadya bookings.",
};

const updated = "14 July 2026";

export default function CancellationPolicyPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">
          Effective date: to be confirmed
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Cancellation policy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          The booking confirmation controls
        </h3>
        <p className="leading-7 text-muted-foreground">
          Cancellation terms can vary by listing, rate plan, dates, and booking
          status. Review the policy shown on the listing and in your booking
          confirmation before paying. That booking-specific policy, together
          with applicable consumer law, controls whether a cancellation is
          allowed and what amount may be refundable.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">How to cancel</h3>
        <ol className="list-decimal space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>
            Open the booking in your Pasadya account and review its current
            status and cancellation terms.
          </li>
          <li>
            Use the available cancellation action and provide a clear reason
            when requested.
          </li>
          <li>
            Keep the confirmation and any refund-request or provider
            correspondence for your records.
          </li>
        </ol>
        <p className="leading-7 text-muted-foreground">
          If the cancellation action is unavailable, contact the participating
          business using the contact details in the booking or listing and keep
          Pasadya informed through the available support channel. A message to a
          business does not by itself change the booking status unless the
          booking record or provider confirms it.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          Refunds and provider cancellations
        </h3>
        <p className="leading-7 text-muted-foreground">
          A cancellation may result in no refund, a partial refund, or a full
          refund depending on the confirmed policy and applicable law. A payment
          provider may process the refund after a cancellation request is
          accepted, so the booking status and payment status may update at
          different times. If a business cancels or cannot deliver the confirmed
          service, contact the business and Pasadya promptly so the booking and
          payment records can be reviewed.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">MVP limitations</h3>
        <p className="leading-7 text-muted-foreground">
          This page does not replace the cancellation terms shown at checkout
          and does not promise a particular refund result. Payment-provider
          procedures, service fees, force-majeure handling, dispute escalation,
          and final consumer-rights language must be confirmed by the operator
          and qualified legal counsel before public launch.
        </p>
      </section>
    </article>
  );
}

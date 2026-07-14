import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "MVP draft terms of service for Pasadya.",
};

const updated = "14 July 2026";

export default function TermsPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">
          Effective date: to be confirmed
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Terms of service</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Using Pasadya</h3>
        <p className="leading-7 text-muted-foreground">
          Pasadya is a local discovery and booking platform for Davao, Samal,
          and nearby destinations. By using the service, you agree to use it
          lawfully, provide information that is reasonably accurate, and follow
          the rules in these terms and any booking-specific terms shown before
          you submit a request or payment.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Listings and bookings</h3>
        <p className="leading-7 text-muted-foreground">
          Businesses and other contributors supply much of the listing, rate,
          availability, review, and route information. Pasadya may review or
          remove content, but does not guarantee that every detail is complete,
          current, safe, available, or suitable for your trip. A booking becomes
          binding only according to the confirmation and terms presented for
          that booking. The participating business remains responsible for the
          stay, activity, service, and on-site delivery it offers.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          Accounts, payments, and conduct
        </h3>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>
            Protect your sign-in details and tell us promptly if you suspect
            unauthorized use.
          </li>
          <li>
            Do not impersonate another person, abuse a business or traveler,
            manipulate reviews, or submit unlawful, harmful, or misleading
            content.
          </li>
          <li>
            Payment processing may be completed by a third-party provider. The
            amount, currency, and payment status shown at checkout or in your
            booking record control that transaction.
          </li>
          <li>
            We may suspend access or hold content when reasonably needed for
            safety, fraud prevention, moderation, or legal compliance.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Your content</h3>
        <p className="leading-7 text-muted-foreground">
          You keep rights in content you submit, but give Pasadya permission to
          host, display, moderate, and use it to operate and improve the
          service. Only submit content you have the right to share, and do not
          include another person&apos;s private information without a lawful
          reason.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Disclaimers and changes</h3>
        <p className="leading-7 text-muted-foreground">
          The service is provided as an MVP and may change, be unavailable, or
          contain errors. Transport information has additional limitations
          described in the transport disclaimer. To the extent permitted by
          applicable law, Pasadya will not be responsible for matters outside
          its reasonable control, including a business&apos;s acts, unsafe
          conditions at a place, weather, traffic, carrier changes, or
          interrupted third-party services. Final liability, dispute,
          governing-law, consumer-rights, and entity terms must be reviewed and
          completed by qualified counsel before launch.
        </p>
      </section>
    </article>
  );
}

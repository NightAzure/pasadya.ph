import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "MVP draft privacy policy for Pasadya.",
};

const updated = "14 July 2026";

export default function PrivacyPolicyPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">
          Effective date: to be confirmed
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Privacy policy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">What this covers</h3>
        <p className="leading-7 text-muted-foreground">
          This draft explains how Pasadya may handle information when you browse
          local listings, create an account, request or manage a booking, use
          transport tools, submit a correction, or contact a business through
          the service. It is written for the MVP and must be completed with the
          final operator identity, contact channel, lawful-basis analysis, and
          required registrations before launch.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Information we may receive</h3>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>
            Account details such as your name, email address, phone number, and
            sign-in provider.
          </li>
          <li>
            Booking details such as dates, guest information, requests, status,
            and payment references.
          </li>
          <li>
            Content you submit, including reviews, questions, route corrections,
            photos, and business-claim information.
          </li>
          <li>
            Technical information needed to secure and operate the service, such
            as device, browser, log, and approximate usage data.
          </li>
          <li>
            Location information only when you choose a feature that needs it,
            such as a route or location-based community signal.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">How we may use it</h3>
        <p className="leading-7 text-muted-foreground">
          We may use information to provide discovery, booking, payment handoff,
          notifications, transport planning, moderation, fraud prevention,
          support, analytics, and service security. We will not use sensitive
          information for a new purpose without an appropriate notice or other
          lawful basis.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">When information is shared</h3>
        <p className="leading-7 text-muted-foreground">
          A booking may require sharing relevant guest and booking details with
          the participating business. Payment, authentication, hosting,
          messaging, and storage providers may process information only to
          support the service. Public reviews, questions, and approved route
          contributions may be shown to other visitors. We may disclose
          information when required by law or to protect users, businesses, or
          the service.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Your choices and retention</h3>
        <p className="leading-7 text-muted-foreground">
          You may ask to access, correct, or delete information, subject to
          identity checks, legal obligations, transaction records, and
          legitimate security needs. Keep your account details accurate and
          avoid putting unnecessary sensitive information in free-text fields.
          Final retention periods, deletion workflows, data-subject request
          contact, security controls, and breach procedures remain launch
          decisions for legal and privacy review.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Updates and contact</h3>
        <p className="leading-7 text-muted-foreground">
          We may update this policy as the service changes and will show the
          revised date. The final published version will identify the
          responsible legal entity and a monitored privacy contact before
          launch. Until then, this draft should not be treated as a completed
          statutory notice.
        </p>
      </section>
    </article>
  );
}

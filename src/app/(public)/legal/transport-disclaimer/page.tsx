import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transport disclaimer",
  description: "MVP draft disclaimer for Pasadya transport information.",
};

const updated = "14 July 2026";

export default function TransportDisclaimerPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">
          Effective date: to be confirmed
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Transport disclaimer</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          Planning information, not a guarantee
        </h3>
        <p className="leading-7 text-muted-foreground">
          Pasadya transport routes, stops, fares, operating hours, ferry
          schedules, travel times, and journey suggestions are informational.
          They may be seeded, contributed by the community, or supplied by a
          source that can change without notice. The map and route geometry may
          be approximate. Pasadya does not operate, own, ticket, or control the
          listed transport services.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Before you travel</h3>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>
            Confirm the current fare, departure time, boarding point, capacity,
            and payment method with the operator or terminal.
          </li>
          <li>
            Allow extra time for traffic, queues, transfers, road conditions,
            weather, and schedule changes.
          </li>
          <li>
            Follow instructions from the operator, terminal staff, and local
            authorities. Do not rely on Pasadya for emergency directions.
          </li>
          <li>
            Use your own judgment about safety, accessibility, belongings, and
            whether a route is appropriate for your group.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Corrections and limits</h3>
        <p className="leading-7 text-muted-foreground">
          If you see a stale fare, stop, or route, use the correction form where
          available. Submissions are reviewed before publication and are not a
          promise that the information will be updated immediately. We are not
          responsible for missed connections, fares, injuries, losses, or other
          outcomes caused by relying on transport information; any final
          limitation and consumer-rights language is subject to legal review.
        </p>
      </section>
    </article>
  );
}

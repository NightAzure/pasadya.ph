import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Gauge,
  Image as ImageIcon,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/modules/listings/search";
import { setCrowdAction } from "@/modules/portal/actions";
import { listOwnerPayouts } from "@/modules/payments";
import {
  crowdLevels,
  getOwnerDashboard,
  getPortalActor,
} from "@/modules/portal/service";

export default async function PortalPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor();
  const params = (await searchParams) ?? {};
  const listings = await getOwnerDashboard(actor.id);
  const payouts = await listOwnerPayouts(actor.id);

  return (
    <main
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Pasadya business portal
          </p>
          <h1 className="text-2xl font-semibold">My Business</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage claimed listings, availability, photos, and today&apos;s
            crowd signal.
          </p>
          {actor.isDevFallback ? (
            <p className="mt-2 rounded-sm border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
              Development mode is using the seeded local owner/admin fallback.
              Production requires a signed-in account.
            </p>
          ) : null}
        </div>
        <Button asChild variant="secondary">
          <Link href="/search">Find a listing to claim</Link>
        </Button>
      </div>

      <StatusNotice params={params} />

      {listings.length === 0 ? (
        <section className="rounded-md border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">No claimed listings yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Open an unclaimed public listing and use “Own this business?” to
            start verification. Phone and email methods auto-approve in local
            development so the portal can be tested end to end.
          </p>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="grid gap-4">
            {listings.map((listing) => (
              <article
                className="rounded-md border bg-card p-4 shadow-sm"
                key={listing.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {listing.businessName}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {listing.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {listing.address.barangay}, {listing.address.municipality}
                    </p>
                  </div>
                  <span className="inline-flex min-h-7 w-fit items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 text-xs font-medium">
                    <ShieldCheck
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-success"
                    />
                    Verified owner
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={<BarChart3 aria-hidden="true" className="h-4 w-4" />}
                    label="This week"
                    value="24 views"
                  />
                  <Metric
                    icon={
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                    }
                    label="Pending bookings"
                    value="Phase 05"
                  />
                  <Metric
                    icon={<ImageIcon aria-hidden="true" className="h-4 w-4" />}
                    label="Photos"
                    value={`${listing.mediaCount} uploaded`}
                  />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Button asChild variant="secondary">
                    <Link href={`/portal/listings/${listing.id}/edit`}>
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                      Edit listing
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/portal/listings/${listing.id}/availability`}>
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                      Set availability
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/place/${listing.slug}`}>
                      View public page
                    </Link>
                  </Button>
                </div>

                <section
                  aria-labelledby={`crowd-${listing.id}`}
                  className="mt-5 rounded-md border bg-muted/40 p-3"
                >
                  <div className="flex items-start gap-2">
                    <Gauge
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        id={`crowd-${listing.id}`}
                      >
                        Crowd status
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Current: {listing.crowdLevel ?? "No live report"}.
                        Business reports expire after 12 hours.
                      </p>
                    </div>
                  </div>
                  <form
                    action={setCrowdAction}
                    className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    <input name="listingId" type="hidden" value={listing.id} />
                    {crowdLevels.map((level) => (
                      <Button
                        key={level}
                        name="level"
                        type="submit"
                        value={level}
                        variant={
                          listing.crowdLevel === level ? "default" : "secondary"
                        }
                      >
                        {level[0].toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </form>
                </section>
              </article>
            ))}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-md border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold">Quick summary</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <SummaryRow label="Claimed listings" value={listings.length} />
                <SummaryRow
                  label="Blocked dates"
                  value={listings.reduce(
                    (total, listing) => total + listing.blockedDates,
                    0,
                  )}
                />
                <SummaryRow
                  label="Published rate floor"
                  value={formatPrice(
                    listings.reduce<number | null>((lowest, listing) => {
                      if (!listing.priceMin) {
                        return lowest;
                      }

                      return lowest === null
                        ? listing.priceMin
                        : Math.min(lowest, listing.priceMin);
                    }, null),
                  )}
                />
              </dl>
            </div>
            <div className="rounded-md border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold">Bookings</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Review guest dates, accept inquiries, and keep payment status in
                one place.
              </p>
              <Button asChild className="mt-4 w-full" variant="secondary">
                <Link href="/portal/bookings">Open booking requests</Link>
              </Button>
            </div>
            <div className="rounded-md border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold">Payouts</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Admin payout batches for your completed, paid bookings appear
                here as they move from pending to completed.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <SummaryRow label="Records" value={payouts.length} />
                <SummaryRow
                  label="Pending"
                  value={
                    payouts.filter((payout) => payout.status === "pending")
                      .length
                  }
                />
                <SummaryRow
                  label="Completed"
                  value={
                    payouts.filter((payout) => payout.status === "completed")
                      .length
                  }
                />
              </dl>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function StatusNotice({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const message = params.claimed
    ? "Claim approved in development mode. You can now manage the listing."
    : params.claimSubmitted
      ? "Claim submitted for admin review."
      : params.crowdUpdated
        ? "Crowd status updated for the next 12 hours."
        : null;

  if (!message) {
    return null;
  }

  return (
    <div
      className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium"
      role="status"
    >
      {message}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

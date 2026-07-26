import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { setAvailabilityAction } from "@/modules/portal/actions";
import { getOwnerListing, getPortalActor } from "@/modules/portal/service";

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor();
  const { listingId } = await params;
  const listing = await getOwnerListing(actor.id, listingId);
  const pageParams = (await searchParams) ?? {};

  if (!listing) {
    notFound();
  }

  const today = new Date();
  const defaultDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <main
      className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Availability</p>
          <h1 className="text-2xl font-semibold">{listing.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Block or reopen dates for all rate plans.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/portal">Back to portal</Link>
        </Button>
      </div>

      {pageParams.saved ? (
        <div
          className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium"
          role="status"
        >
          Availability saved.
        </div>
      ) : null}

      <form
        action={setAvailabilityAction}
        className="space-y-4 rounded-md border bg-card p-4 shadow-sm sm:p-5"
      >
        <input name="listingId" type="hidden" value={listing.id} />
        <label className="block">
          <span className="text-sm font-medium">Inventory scope</span>
          <select
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            name="ratePlanId"
          >
            <option value="">All rate plans (shared listing inventory)</option>
            {listing.ratePlans.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Date</span>
          <input
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue={defaultDate}
            name="date"
            required
            type="date"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Status</span>
          <select
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue="false"
            name="available"
          >
            <option value="false">Blocked</option>
            <option value="true">Available</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Quantity</span>
          <input
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue="1"
            min="0"
            name="quantity"
            type="number"
          />
        </label>
        <Button className="w-full" size="lg" type="submit">
          Save date
        </Button>
      </form>

      <section className="mt-6 rounded-md border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Upcoming saved dates</h2>
        {listing.availability.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No saved availability changes yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {listing.availability.map((block) => (
              <li
                className="flex min-h-12 items-center justify-between gap-3 py-2"
                key={block.id}
              >
                <span>{block.date}</span>
                <span className="font-medium">
                  {block.available ? "Available" : "Blocked"} · Qty{" "}
                  {block.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

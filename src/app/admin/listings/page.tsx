import { getAdminActor, listAdminListings } from "@/modules/admin";
import { Button } from "@/components/ui/button";
import { AdminHeader, AdminNav } from "../_components";
import {
  createListingAction,
  mergeListingsAction,
  updateListingStatusAction,
} from "../actions";

export default async function AdminListingsPage() {
  await getAdminActor("moderator");
  const [published, drafts, closed] = await Promise.all([
    listAdminListings({ status: "published" }),
    listAdminListings({ status: "draft" }),
    listAdminListings({ status: "closed" }),
  ]);
  const listings = [...published, ...drafts, ...closed];
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Listing operations"
        description="Create draft listings, publish or unpublish inventory, and merge duplicate records with an audit trail."
      />
      <AdminNav active="listings" />

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <form
          action={createListingAction}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Create listing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Adds an unclaimed draft or published listing for admin seeding.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span>Name</span>
              <input
                className="min-h-11 rounded-md border bg-background px-3"
                name="name"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Category</span>
              <select
                className="min-h-11 rounded-md border bg-background px-3"
                defaultValue="resort"
                name="category"
              >
                <option value="resort">Resort</option>
                <option value="room">Room</option>
                <option value="restaurant">Restaurant</option>
                <option value="activity">Activity</option>
                <option value="service">Service</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Status</span>
              <select
                className="min-h-11 rounded-md border bg-background px-3"
                defaultValue="draft"
                name="status"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Description</span>
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2"
                name="description"
              />
            </label>
            <Button className="min-h-11" type="submit">
              Create listing
            </Button>
          </div>
        </form>

        <form
          action={mergeListingsAction}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Merge duplicates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Moves bookings, reviews, media, and related rows onto the target
            listing, then archives the source.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span>Source listing (duplicate)</span>
              <select
                className="min-h-11 rounded-md border bg-background px-3"
                name="sourceListingId"
                required
              >
                <option value="">Select source</option>
                {listings.map((listing) => (
                  <option key={`source-${listing.id}`} value={listing.id}>
                    {listing.name} ({listing.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Target listing (keep)</span>
              <select
                className="min-h-11 rounded-md border bg-background px-3"
                name="targetListingId"
                required
              >
                <option value="">Select target</option>
                {listings.map((listing) => (
                  <option key={`target-${listing.id}`} value={listing.id}>
                    {listing.name} ({listing.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Merge notes</span>
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2"
                name="notes"
                required
              />
            </label>
            <Button className="min-h-11" type="submit" variant="secondary">
              Merge listings
            </Button>
          </div>
        </form>
      </section>

      <section className="grid gap-3">
        {listings.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No listings found.
          </div>
        ) : (
          listings.map((listing) => (
            <article
              className="rounded-lg border bg-card p-4 shadow-sm"
              key={listing.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    {listing.category} · {listing.claimStatus}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{listing.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {listing.businessName ?? "Unclaimed listing"} ·{" "}
                    {listing.mediaCount} media · {listing.bookingCount} bookings
                  </p>
                </div>
                <span className="rounded-md border border-success/40 bg-success/10 px-2 py-1 text-xs font-semibold">
                  {listing.status}
                </span>
              </div>
              <p className="mt-3 break-words text-sm text-muted-foreground">
                /{listing.slug}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {listing.id}
              </p>
              <form action={updateListingStatusAction} className="mt-4">
                <input name="listingId" type="hidden" value={listing.id} />
                <input
                  name="status"
                  type="hidden"
                  value={
                    listing.status === "published" ? "closed" : "published"
                  }
                />
                <Button
                  className="min-h-11"
                  type="submit"
                  variant={
                    listing.status === "published" ? "destructive" : "secondary"
                  }
                >
                  {listing.status === "published"
                    ? "Unpublish listing"
                    : "Publish listing"}
                </Button>
              </form>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

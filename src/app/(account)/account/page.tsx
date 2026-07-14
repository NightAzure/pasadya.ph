import Link from "next/link";

import { getPortalActor } from "@/modules/portal/service";
import { getUnreadCount } from "@/modules/notifications/service";

export default async function AccountPage() {
  const actor = await getPortalActor();
  const unreadCount = await getUnreadCount(actor.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-2 text-muted-foreground">
        Keep your trips, community activity, and updates together.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-md border bg-card p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/account/bookings"
        >
          <p className="font-semibold">Bookings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            View upcoming and past stays.
          </p>
        </Link>
        <Link
          className="rounded-md border bg-card p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/account/notifications"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Notifications</p>
            <span className="rounded-sm border bg-muted px-2 py-1 text-xs font-medium">
              {unreadCount} unread
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Booking, claim, review, and route updates.
          </p>
        </Link>
      </div>
    </main>
  );
}

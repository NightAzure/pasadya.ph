import Link from "next/link";

import { NotificationList } from "@/components/notifications/notification-list";
import { getPortalActor } from "@/modules/portal/service";
import { listNotificationsForActor } from "@/modules/notifications/service";

export default async function NotificationsPage() {
  const actor = await getPortalActor();
  const center = await listNotificationsForActor(actor.id);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-medium text-primary" href="/account">
        ← Account
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Updates</p>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Booking, claim, review, and contribution updates in one place.
          </p>
        </div>
        <span className="rounded-sm border bg-muted px-2 py-1 text-xs font-medium">
          {center.unreadCount} unread
        </span>
      </div>
      <div className="mt-6">
        <NotificationList
          initialItems={center.items.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt).toISOString(),
          }))}
        />
      </div>
    </main>
  );
}

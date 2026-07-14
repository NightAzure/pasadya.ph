import {
  getAdminActor,
  getAdminMetrics,
  listModerationItems,
} from "@/modules/admin";

import {
  AdminHeader,
  AdminNav,
  MetricStrip,
  ModerationWorkspace,
} from "./_components";

export default async function AdminPage() {
  const actor = await getAdminActor("moderator");
  const [items, metrics] = await Promise.all([
    listModerationItems(),
    getAdminMetrics(),
  ]);

  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Moderation queues"
        description="Review claims, flagged reviews, photos, route contributions, and listing reports from one operational queue."
      />
      <AdminNav active="moderation" />
      <MetricStrip metrics={metrics} />
      {actor.isDevFallback ? (
        <p
          className="mb-5 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs"
          role="status"
        >
          Development mode is using the seeded local admin fallback.
        </p>
      ) : null}
      <ModerationWorkspace items={items} />
    </main>
  );
}

import { getAdminActor, listAdminRoutes } from "@/modules/admin";

import { AdminHeader, AdminNav } from "../_components";

export default async function AdminRoutesPage() {
  await getAdminActor("moderator");
  const routes = await listAdminRoutes();
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Transport operations"
        description="Review published and contributed routes before transport data is refreshed or changed by an authorized operator."
      />
      <AdminNav active="routes" />
      <section className="grid gap-3">
        {routes.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No transport routes found.
          </div>
        ) : (
          routes.map((route) => (
            <article
              className="rounded-lg border bg-card p-4 shadow-sm"
              key={route.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    {route.mode} · {route.source}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{route.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {route.stopCount} stops · updated{" "}
                    {new Date(route.updatedAt).toLocaleDateString("en-PH")}
                  </p>
                </div>
                <span className="rounded-md border px-2 py-1 text-xs font-semibold">
                  {route.status}
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

import { getAdminActor } from "@/modules/admin";
import { getLaunchSeedChecklist } from "@/modules/launch/seed-checklist";

import { AdminHeader, AdminNav } from "../_components";

export default async function AdminLaunchPage() {
  await getAdminActor("admin");
  const checklist = await getLaunchSeedChecklist();
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Launch readiness"
        description="Track development seed coverage here. Provider credentials, legal approval, real content, performance, and beta operations still require explicit evidence before launch."
      />
      <AdminNav active="launch" />
      <section
        className={`mb-6 rounded-lg border p-5 shadow-sm ${checklist.ready ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}`}
        role="status"
      >
        <p className="text-sm font-semibold">
          {checklist.ready
            ? "Seed checklist meets its development minimums"
            : "Seed checklist is not ready"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Checked {checklist.checkedAt.toLocaleString("en-PH")}. These are
          minimum development checks, not a public launch approval.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checklist.items.map((item) => (
          <article
            className="rounded-lg border bg-card p-4 shadow-sm"
            key={item.key}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{item.label}</h2>
              <span
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${item.ready ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}`}
              >
                {item.ready ? "Ready" : "Gap"}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Actual:{" "}
              <span className="font-semibold text-foreground">
                {item.actual}
              </span>{" "}
              · Minimum: {item.minimum}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}

import { getAdminActor, getAdminMetrics } from "@/modules/admin";
import { AdminHeader, AdminNav } from "../_components";

export default async function AdminMetricsPage() {
  await getAdminActor("moderator");
  const metrics = await getAdminMetrics();
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Operations metrics"
        description="A development dashboard for queue load, listing coverage, booking activity, paid GMV, and payout preparation."
      />
      <AdminNav active="metrics" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(metrics)
          .filter(([key]) => key !== "queueByType")
          .map(([key, value]) => (
            <div className="rounded-lg border bg-card p-4 shadow-sm" key={key}>
              <p className="text-xs font-medium text-muted-foreground">
                {labelize(key)}
              </p>
              <p className="mt-2 text-xl font-semibold">
                {typeof value === "number" && key.toLowerCase().includes("gmv")
                  ? php(value)
                  : String(value)}
              </p>
            </div>
          ))}
        <div className="rounded-lg border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-3">
          <h2 className="font-semibold">Pending queue by type</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(metrics.queueByType).map(([key, value]) => (
              <div className="rounded-md border bg-background p-3" key={key}>
                <dt className="text-xs text-muted-foreground">
                  {labelize(key)}
                </dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </main>
  );
}
function labelize(value: string) {
  return value
    .replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function php(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

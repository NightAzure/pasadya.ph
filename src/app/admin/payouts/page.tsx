import Link from "next/link";

import { formatBookingMoney } from "@/components/booking/contracts";
import { Button } from "@/components/ui/button";
import { getPayoutDomain } from "@/app/api/payouts/_domain";
import type { PayoutReconciliation } from "@/app/api/payouts/_domain";
import { getPortalActor } from "@/modules/portal/service";
import { AdminHeader, AdminNav } from "../_components";

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor({ minimumRole: "admin" });
  const params = (await searchParams) ?? {};
  const domain = await getPayoutDomain();
  const payouts = domain?.listPayouts
    ? await domain.listPayouts(actor.id)
    : null;
  const reconciliation = domain?.getPayoutReconciliation
    ? await domain.getPayoutReconciliation(actor.id)
    : null;
  const notice = first(params.updated);
  return (
    <main
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Manual payouts"
        description="Create weekly manual payout records, export transfer batches, and reconcile local payment proceeds before sending GCash or bank transfers."
      />
      <AdminNav active="payouts" />
      {actor.isDevFallback ? (
        <p className="mb-5 rounded-sm border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
          Development mode is using the seeded local admin fallback.
        </p>
      ) : null}
      {notice ? (
        <div
          className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm"
          role="status"
        >
          Payout status updated.
        </div>
      ) : null}
      {payouts === null || reconciliation === null ? (
        <Unavailable />
      ) : (
        <>
          <ReconciliationSummary reconciliation={reconciliation} />
          <div className="mb-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/api/admin/payouts/export">Download payout CSV</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/api/admin/payouts/export?status=pending">
                Download pending CSV
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin">Back to admin</Link>
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="grid gap-4">
              {payouts.length === 0 ? (
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                  <h2 className="text-lg font-semibold">No payout records</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Completed, paid bookings become eligible for manual payout
                    after the payment and booking domain confirms them.
                  </p>
                </div>
              ) : (
                payouts.map((payout) => (
                  <PayoutCard
                    id={payout.id}
                    key={payout.id}
                    method={payout.method}
                    amount={formatBookingMoney(payout.amount)}
                    businessName={payout.businessName}
                    bookingCount={payout.bookingIds.length}
                    reference={payout.reference}
                    status={payout.status}
                  />
                ))
              )}
            </section>
            <PayoutForm />
          </div>
          <ReconciliationExceptions reconciliation={reconciliation} />
        </>
      )}
    </main>
  );
}

function ReconciliationSummary({
  reconciliation,
}: {
  reconciliation: PayoutReconciliation;
}) {
  const values = [
    ["Rows checked", reconciliation.summary.totalRows],
    ["Reconciled", reconciliation.summary.reconciledCount],
    ["Needs review", reconciliation.summary.exceptionCount],
    ["Ready for payout", reconciliation.summary.readyForPayoutCount],
  ] as const;
  return (
    <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {values.map(([label, value]) => (
        <div className="rounded-lg border bg-card p-4 shadow-sm" key={label}>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-semibold">{value}</p>
        </div>
      ))}
      <div className="rounded-lg border bg-muted/30 p-4 text-sm sm:col-span-2 lg:col-span-4">
        <p className="font-semibold">Local payment reconciliation</p>
        <p className="mt-1 text-muted-foreground">
          Expected proceeds{" "}
          {formatBookingMoney(reconciliation.summary.expectedAmount)} · recorded
          payments {formatBookingMoney(reconciliation.summary.paidAmount)} ·
          payout records{" "}
          {formatBookingMoney(reconciliation.summary.payoutAmount)}
        </p>
      </div>
    </section>
  );
}

function ReconciliationExceptions({
  reconciliation,
}: {
  reconciliation: PayoutReconciliation;
}) {
  const rows = reconciliation.rows
    .filter(
      (row) =>
        row.reconciliationStatus !== "reconciled" &&
        row.reconciliationStatus !== "not_applicable",
    )
    .slice(0, 12);
  return (
    <section className="mt-6 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reconciliation review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review payment, payout, and provider-ID mismatches before the weekly
            batch.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Checked {new Date(reconciliation.generatedAt).toLocaleString("en-PH")}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
          No reconciliation exceptions were found in the local records.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => (
            <article
              className="rounded-md border bg-background p-3"
              key={row.bookingId}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{row.listingName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Booking {row.bookingId} ·{" "}
                    {row.businessName ?? "Unclaimed listing"}
                  </p>
                </div>
                <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-semibold">
                  {row.reconciliationStatus.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Expected {formatBookingMoney(row.expectedAmount)} · payment{" "}
                {formatBookingMoney(row.paymentAmount ?? 0)} · payout{" "}
                {formatBookingMoney(row.payoutAmount)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PayoutCard({
  id,
  method,
  amount,
  businessName,
  bookingCount,
  reference,
  status,
}: {
  id: string;
  method: string;
  amount: string;
  businessName: string;
  bookingCount: number;
  reference?: string | null;
  status: string;
}) {
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {businessName}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{amount}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {bookingCount} booking{bookingCount === 1 ? "" : "s"} ·{" "}
            {method === "gcash" ? "GCash" : "Bank transfer"}
          </p>
        </div>
        <span className="inline-flex min-h-7 items-center rounded-sm border px-2 text-xs font-semibold">
          {status}
        </span>
      </div>
      {reference ? (
        <p className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
          Reference: <span className="font-medium">{reference}</span>
        </p>
      ) : status === "pending" ? (
        <form
          action={`/api/payouts/${id}/complete`}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          method="post"
        >
          <label className="sr-only" htmlFor={`reference-${id}`}>
            Transfer reference
          </label>
          <input
            className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id={`reference-${id}`}
            name="reference"
            placeholder="GCash or bank reference"
            required
          />
          <Button type="submit">Mark completed</Button>
        </form>
      ) : null}
    </article>
  );
}
function PayoutForm() {
  return (
    <aside className="h-fit rounded-lg border bg-card p-5 shadow-sm lg:sticky lg:top-24">
      <h2 className="text-base font-semibold">Create payout record</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Use completed booking IDs from the payout report. Amounts are in
        centavos, matching the payments domain contract.
      </p>
      <form action="/api/payouts" className="mt-5 space-y-4" method="post">
        <Field label="Business ID" name="businessId" placeholder="UUID" />
        <Field label="Booking IDs" name="bookingIds" placeholder="UUID, UUID" />
        <Field
          label="Amount (centavos)"
          name="amount"
          placeholder="500000"
          type="number"
        />
        <label className="block">
          <span className="text-sm font-medium">Method</span>
          <select
            className="mt-2 min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            name="method"
            defaultValue="gcash"
          >
            <option value="gcash">GCash</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </label>
        <Button className="w-full" type="submit">
          Create pending payout
        </Button>
      </form>
    </aside>
  );
}
function Field({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}
function Unavailable() {
  return (
    <section
      className="rounded-lg border border-warning/40 bg-warning/10 p-5 text-sm leading-6"
      role="status"
    >
      <h2 className="font-semibold">Payout service unavailable</h2>
      <p className="mt-1 text-muted-foreground">
        The admin workspace is ready, but the typed Phase 05 payments/payouts
        service is not present in this checkout. No payout record was created.
      </p>
    </section>
  );
}
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

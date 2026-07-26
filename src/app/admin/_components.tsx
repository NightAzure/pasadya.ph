import Link from "next/link";

import { Button } from "@/components/ui/button";
import { resolveModerationAction } from "./actions";
import type {
  AdminMetrics,
  ListingModerationDetails,
  ModerationItem,
} from "@/modules/admin";

export function AdminNav({ active }: { active: string }) {
  const links = [
    ["moderation", "Moderation", "/admin"],
    ["bookings", "Bookings", "/admin/bookings"],
    ["listings", "Listings", "/admin/listings"],
    ["data-quality", "Data quality", "/admin/data-quality"],
    ["routes", "Routes", "/admin/routes"],
    ["users", "Users", "/admin/users"],
    ["metrics", "Metrics", "/admin/metrics"],
    ["payouts", "Payouts", "/admin/payouts"],
    ["launch", "Launch", "/admin/launch"],
  ] as const;

  return (
    <nav
      aria-label="Admin sections"
      className="mb-6 w-full max-w-full overflow-x-auto"
    >
      <div className="flex min-w-max gap-2 rounded-lg border bg-card p-2 shadow-sm">
        {links.map(([key, label, href]) => (
          <Link
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium ${
              active === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            href={href}
            key={key}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AdminHeader({
  eyebrow = "Pasadya admin",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </header>
  );
}

export function MetricStrip({ metrics }: { metrics: AdminMetrics }) {
  const values = [
    ["Published listings", metrics.publishedListings],
    ["Pending moderation", metrics.pendingModeration],
    ["Bookings this month", metrics.bookingsThisMonth],
    ["Paid GMV", php(metrics.paidGmv)],
  ] as const;
  return (
    <section
      aria-label="Admin metrics"
      className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {values.map(([label, value]) => (
        <div className="rounded-lg border bg-card p-4 shadow-sm" key={label}>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-semibold">{value}</p>
        </div>
      ))}
    </section>
  );
}

export function ModerationWorkspace({ items }: { items: ModerationItem[] }) {
  const selected = items[0] ?? null;
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.4fr)]">
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between px-2 pb-3">
          <h2 className="text-base font-semibold">Queue</h2>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
            {items.length} pending
          </span>
        </div>
        {items.length === 0 ? (
          <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
            No pending moderation items.
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map((item) => (
              <div className="rounded-md border p-3" key={item.queueId}>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {item.type.replaceAll("_", " ")}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">
                  {itemTitle(item)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("en-PH")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <ModerationDetail item={selected} />
    </section>
  );
}

function ModerationDetail({ item }: { item: ModerationItem | null }) {
  if (!item) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Select a queue item to review its details.
      </div>
    );
  }
  const detail = item.details;
  return (
    <article className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {item.type.replaceAll("_", " ")}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{itemTitle(item)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {new Date(item.createdAt).toLocaleString("en-PH")}
          </p>
        </div>
        {detail && "listingSlug" in detail && detail.listingSlug ? (
          <Button asChild variant="secondary">
            <Link href={`/place/${detail.listingSlug}`}>View listing</Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Reason" value={item.reason ?? "Manual review"} />
        <Info label="Reference" value={item.referenceId} mono />
        {detail?.kind === "claim" ? (
          <>
            <Info
              label="Claimant"
              value={detail.claimantName ?? "Registered user"}
            />
            <Info
              label="Method"
              value={detail.method?.replaceAll("_", " ") ?? "Manual review"}
            />
            <Info
              label="Contact"
              value={detail.claimantEmail ?? "Not provided"}
            />
            <Info
              label="Verification data"
              value="Restricted fields available to authorized reviewers."
            />
          </>
        ) : null}
        {detail?.kind === "review" ? (
          <div className="rounded-md border bg-muted/30 p-3 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Review</p>
            <p className="mt-1 break-words text-sm">
              {detail.body ?? "No review text"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Rating: {detail.rating ?? "—"}/5 · Author:{" "}
              {detail.authorName ?? "Registered user"}
            </p>
          </div>
        ) : null}
        {detail?.kind === "photo" ? (
          <div className="rounded-md border bg-muted/30 p-3 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              {detail.mediaKind === "review" ? "Review photo" : "Listing photo"}
            </p>
            {detail.url ? (
              <a
                className="mt-2 block break-all text-sm font-medium text-primary underline underline-offset-2"
                href={detail.url}
                rel="noreferrer"
                target="_blank"
              >
                Open submitted photo
              </a>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Photo URL is unavailable.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {detail.caption || "No caption"} · Uploaded by{" "}
              {detail.uploadedBy ?? "unknown user"}
            </p>
          </div>
        ) : null}
        {detail?.kind === "route_contribution" ? (
          <div className="rounded-md border bg-muted/30 p-3 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              Contribution
            </p>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5">
              {JSON.stringify(detail.data, null, 2)}
            </pre>
          </div>
        ) : null}
        {detail?.kind === "listing_report" ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              Listing report
            </p>
            <p className="mt-1 break-words text-sm">
              {item.reason ?? "No report reason supplied."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Current status: {detail.listingStatus ?? "unknown"} · Reporter:{" "}
              {stringPayloadValue(detail.payload, "reporterId") ??
                "authenticated user"}
            </p>
          </div>
        ) : null}
        {detail?.kind === "listing_edit" ? (
          <div className="rounded-md border bg-muted/30 p-3 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              Suggested listing changes
            </p>
            <ListingChangeDiff detail={detail} />
          </div>
        ) : null}
      </div>

      {detail?.kind === "listing_report" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <form action={resolveModerationAction}>
            <input name="queueId" type="hidden" value={item.queueId} />
            <input name="decision" type="hidden" value="approve" />
            <input name="listingAction" type="hidden" value="unpublish" />
            <input
              name="notes"
              type="hidden"
              value="Report accepted; listing unpublished for investigation."
            />
            <Button
              className="min-h-12 w-full"
              type="submit"
              variant="destructive"
            >
              Accept report & unpublish
            </Button>
          </form>
          <form action={resolveModerationAction}>
            <input name="queueId" type="hidden" value={item.queueId} />
            <input name="decision" type="hidden" value="approve" />
            <input name="listingAction" type="hidden" value="archive" />
            <input
              name="notes"
              type="hidden"
              value="Report accepted; listing archived."
            />
            <Button
              className="min-h-12 w-full"
              type="submit"
              variant="secondary"
            >
              Accept report & archive
            </Button>
          </form>
          <RejectModerationForm queueId={item.queueId} label="Dismiss report" />
        </div>
      ) : detail?.kind === "listing_edit" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <form action={resolveModerationAction}>
            <input name="queueId" type="hidden" value={item.queueId} />
            <input name="decision" type="hidden" value="approve" />
            <input name="listingAction" type="hidden" value="edit" />
            <input
              name="listingChanges"
              type="hidden"
              value={JSON.stringify(detail.payload.changes ?? {})}
            />
            <input
              name="notes"
              type="hidden"
              value="Structured listing edit reviewed and applied."
            />
            <Button className="min-h-12 w-full" type="submit">
              Apply suggested edit
            </Button>
          </form>
          <RejectModerationForm
            queueId={item.queueId}
            label="Reject suggested edit"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <form action={resolveModerationAction}>
            <input name="queueId" type="hidden" value={item.queueId} />
            <input name="decision" type="hidden" value="approve" />
            <Button className="min-h-12 w-full" type="submit">
              Approve / keep
            </Button>
          </form>
          <RejectModerationForm queueId={item.queueId} />
        </div>
      )}
    </article>
  );
}

function RejectModerationForm({
  queueId,
  label = "Reject / remove",
}: {
  queueId: string;
  label?: string;
}) {
  return (
    <form action={resolveModerationAction} className="grid gap-2">
      <input name="queueId" type="hidden" value={queueId} />
      <input name="decision" type="hidden" value="reject" />
      <label className="sr-only" htmlFor={`notes-${queueId}`}>
        Rejection notes
      </label>
      <input
        className="min-h-12 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        id={`notes-${queueId}`}
        name="notes"
        placeholder="Reason required for rejection"
        required
      />
      <Button className="min-h-12 w-full" type="submit" variant="destructive">
        {label}
      </Button>
    </form>
  );
}

function ListingChangeDiff({ detail }: { detail: ListingModerationDetails }) {
  const changes = asRecord(detail.payload.changes);
  const entries = Object.entries(changes);
  if (entries.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        No structured changes were supplied. Reject this request and ask for a
        corrected submission.
      </p>
    );
  }

  return (
    <dl className="mt-3 grid gap-2">
      {entries.map(([key, proposed]) => (
        <div className="rounded-md border bg-background p-3" key={key}>
          <dt className="text-xs font-medium text-muted-foreground">
            {labelize(key)}
          </dt>
          <dd className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
            <span className="break-words">
              <span className="text-xs text-muted-foreground">Current: </span>
              {displayValue(
                (detail as unknown as Record<string, unknown>)[key],
              )}
            </span>
            <span className="break-words">
              <span className="text-xs text-muted-foreground">Suggested: </span>
              {displayValue(proposed)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function itemTitle(item: ModerationItem) {
  const detail = item.details;
  if (!detail) return "Missing moderation detail";
  if ("listingName" in detail && detail.listingName) return detail.listingName;
  if (detail.kind === "route_contribution")
    return `${detail.contributionType ?? "Route"} contribution`;
  return `${detail.kind.replaceAll("_", " ")} review`;
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 break-words font-medium ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function stringPayloadValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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

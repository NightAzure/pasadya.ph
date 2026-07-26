import {
  getAdminActor,
  getDataQualityAudits,
  getDataQualityItems,
  getDuplicateCandidates,
  listAdminAreas,
} from "@/modules/admin";
import { AdminHeader, AdminNav } from "../_components";
import {
  assignAreasAction,
  repairLocationAction,
  repairPrimaryRateAction,
  repairProvenanceAction,
} from "./actions";
import { reviewDuplicateAction } from "./duplicate-action";
import { LocationRepairMap } from "@/components/admin/location-repair-map";

export default async function AdminDataQualityPage() {
  await getAdminActor("moderator");
  const [items, areas, duplicates] = await Promise.all([
    getDataQualityItems(),
    listAdminAreas(),
    getDuplicateCandidates(),
  ]);
  const needsRepair = items.filter(
    (item) =>
      !item.latitude ||
      !item.primaryRateComplete ||
      !item.hoursComplete ||
      !item.provenanceComplete ||
      item.routeFreshness !== "fresh",
  );
  const auditsByListing = new Map(
    await Promise.all(
      items.map(
        async (item) => [item.id, await getDataQualityAudits(item.id)] as const,
      ),
    ),
  );

  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="Search data-quality repair"
        description="Review location, primary-rate, hours, source and route evidence before publishing. Unknown remains unknown; this workspace never converts owner input into verified data."
      />
      <AdminNav active="data-quality" />
      <p aria-live="polite" className="mb-4 text-sm text-muted-foreground">
        {needsRepair.length} listings need repair. Open a listing to correct its
        address or primary rate; publishing is blocked until both are usable.
      </p>
      <form
        action={assignAreasAction}
        className="mb-6 rounded-lg border bg-card p-4 shadow-sm"
        id="bulk-area"
      >
        <h2 className="text-lg font-semibold">
          Bulk canonical-area assignment
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select records below, choose the reviewed area, and record why. This
          changes area metadata only; it never changes the pin.
        </p>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid min-w-0 gap-1 text-sm">
            <span>Canonical area</span>
            <select
              className="min-h-11 w-full min-w-0 rounded-md border bg-background px-3"
              name="canonicalAreaId"
              required
            >
              <option value="">Choose area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} ({area.type})
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            <span>Review notes</span>
            <input
              className="min-h-11 w-full min-w-0 rounded-md border bg-background px-3"
              name="notes"
              required
            />
          </label>
        </div>
        <button
          className="mt-3 min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          type="submit"
        >
          Assign selected areas
        </button>
      </form>
      <section className="grid gap-3">
        {items.map((item) => {
          const issues = [
            !item.latitude && "missing coordinate",
            !item.primaryRateComplete && "ambiguous primary rate",
            !item.hoursComplete && "missing hours",
            !item.provenanceComplete && "missing provenance",
            item.routeFreshness !== "fresh" &&
              `${item.routeFreshness} route evidence`,
          ].filter(Boolean);
          return (
            <article
              className="rounded-lg border bg-card p-4 shadow-sm"
              key={item.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase text-primary">
                    {item.category} · {item.status}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Location trust: {item.locationTrust} ·{" "}
                    {item.canonicalAreaName ?? "No canonical area"} · nearest
                    stop:{" "}
                    {item.nearestStopM === null
                      ? "unknown"
                      : `${item.nearestStopM} m`}
                  </p>
                </div>
                <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-semibold">
                  {issues.length
                    ? `${issues.length} checks`
                    : "Ready for review"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {issues.length
                  ? `Needs: ${issues.join(", ")}.`
                  : "Structured search data is present; perform moderation review before publishing."}
              </p>
              <div className="mt-4 grid gap-3 border-t pt-4 lg:grid-cols-2">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    form="bulk-area"
                    name="listingIds"
                    type="checkbox"
                    value={item.id}
                  />{" "}
                  Select for bulk area assignment
                </label>
                <form
                  action={repairLocationAction}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <input name="listingId" type="hidden" value={item.id} />
                  <p className="text-sm font-semibold">Coordinate correction</p>
                  <LocationRepairMap
                    address={item.address}
                    initial={
                      item.latitude === null || item.longitude === null
                        ? null
                        : { latitude: item.latitude, longitude: item.longitude }
                    }
                  />
                  <select
                    aria-label="Canonical area"
                    className="min-h-11 rounded-md border px-3"
                    defaultValue={
                      areas.find((area) => area.name === item.canonicalAreaName)
                        ?.id ?? ""
                    }
                    name="canonicalAreaId"
                  >
                    <option value="">Keep current area</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="min-h-11 rounded-md border px-3"
                    name="evidenceUrl"
                    placeholder="https://evidence.example/location"
                    required
                    type="url"
                  />
                  <input
                    className="min-h-11 rounded-md border px-3"
                    name="sourceNote"
                    placeholder="Evidence / correction note"
                    required
                  />
                  <input
                    className="min-h-11 rounded-md border px-3"
                    name="overrideReason"
                    placeholder="Required only outside launch bounds"
                  />
                  <button
                    className="min-h-11 rounded-md border px-3 text-sm font-medium"
                    type="submit"
                  >
                    Save reviewed coordinate
                  </button>
                </form>
                {item.primaryRateId ? (
                  <form
                    action={repairPrimaryRateAction}
                    className="grid gap-2 rounded-md border p-3"
                  >
                    <input name="listingId" type="hidden" value={item.id} />
                    <input
                      name="rateId"
                      type="hidden"
                      value={item.primaryRateId}
                    />
                    <p className="text-sm font-semibold">Primary-rate review</p>
                    <p className="text-sm text-muted-foreground">
                      Make the current active rate primary after checking its
                      structured declaration.
                    </p>
                    <input
                      className="min-h-11 rounded-md border px-3"
                      name="evidenceUrl"
                      placeholder="https://evidence.example/rate"
                      required
                      type="url"
                    />
                    <input
                      className="min-h-11 rounded-md border px-3"
                      name="notes"
                      placeholder="Review evidence"
                      required
                    />
                    <button
                      className="min-h-11 rounded-md border px-3 text-sm font-medium"
                      type="submit"
                    >
                      Confirm primary rate
                    </button>
                  </form>
                ) : (
                  <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                    No rate exists. Ask the owner to add a structured primary
                    rate.
                  </p>
                )}
                <form
                  action={repairProvenanceAction}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <input name="listingId" type="hidden" value={item.id} />
                  <p className="text-sm font-semibold">
                    Source and provenance review
                  </p>
                  <select
                    className="min-h-11 rounded-md border px-3"
                    defaultValue="location"
                    name="fieldName"
                  >
                    <option value="location">Location</option>
                    <option value="rate">Rate</option>
                    <option value="capacity">Capacity</option>
                    <option value="hours">Hours</option>
                    <option value="attributes">Attributes</option>
                  </select>
                  <select
                    className="min-h-11 rounded-md border px-3"
                    defaultValue="team_verified"
                    name="trustStatus"
                  >
                    <option value="team_verified">Team-verified</option>
                    <option value="owner_provided">Owner-provided</option>
                    <option value="estimated">Estimated</option>
                    <option value="stale">Stale</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <input
                    className="min-h-11 rounded-md border px-3"
                    name="evidenceUrl"
                    placeholder="Evidence URL required for team verification"
                    type="url"
                  />
                  <input
                    className="min-h-11 rounded-md border px-3"
                    name="sourceNote"
                    placeholder="Evidence note"
                    required
                  />
                  <button
                    className="min-h-11 rounded-md border px-3 text-sm font-medium"
                    type="submit"
                  >
                    Record provenance
                  </button>
                </form>
              </div>
              <div className="mt-4 rounded-md border bg-muted/20 p-3">
                <h3 className="text-sm font-semibold">
                  Data-quality audit trail
                </h3>
                {(auditsByListing.get(item.id) ?? []).length ? (
                  <ol className="mt-2 grid gap-2">
                    {(auditsByListing.get(item.id) ?? []).map((audit) => (
                      <li
                        className="border-l-2 border-primary/40 pl-3 text-sm"
                        key={audit.id}
                      >
                        <span className="font-medium">
                          {audit.action
                            .replace("admin.data_quality.", "")
                            .replaceAll("_", " ")}
                        </span>{" "}
                        · {audit.actorName ?? "System"} ·{" "}
                        {new Date(audit.createdAt).toLocaleString("en-PH")}
                        <AuditChangeSummary changes={audit.changes} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No Phase 3 repairs recorded for this listing.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>
      <section className="mt-8 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Duplicate candidates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidates are suggestions only; review the name-similarity and
          distance evidence before using the existing merge action.
        </p>
        {duplicates.length ? (
          <ul className="mt-3 grid gap-2">
            {duplicates.map((candidate) => (
              <li
                className="rounded-md border p-3 text-sm"
                key={`${candidate.sourceId}-${candidate.candidateId}`}
              >
                {candidate.sourceName} ↔ {candidate.candidateName} · similarity{" "}
                {candidate.nameSimilarity} · {candidate.distanceM} m apart
                <form
                  action={reviewDuplicateAction}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    name="sourceListingId"
                    type="hidden"
                    value={candidate.sourceId}
                  />
                  <input
                    name="candidateListingId"
                    type="hidden"
                    value={candidate.candidateId}
                  />
                  <select
                    aria-label={`Duplicate decision for ${candidate.sourceName} and ${candidate.candidateName}`}
                    className="min-h-11 rounded-md border bg-background px-3"
                    defaultValue={candidate.lastDecision ?? "not_duplicate"}
                    name="decision"
                  >
                    <option value="not_duplicate">Not a duplicate</option>
                    <option value="needs_merge_review">
                      Needs merge review
                    </option>
                  </select>
                  <input
                    className="min-h-11 rounded-md border bg-background px-3"
                    defaultValue={candidate.reviewNotes ?? ""}
                    name="notes"
                    placeholder="Decision evidence"
                    required
                  />
                  <button
                    className="min-h-11 rounded-md border px-3 text-sm font-medium"
                    type="submit"
                  >
                    Record decision
                  </button>
                </form>
                {candidate.lastDecision ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last decision: {candidate.lastDecision.replaceAll("_", " ")}{" "}
                    by {candidate.reviewerName ?? "an admin"} on{" "}
                    {candidate.reviewedAt
                      ? new Date(candidate.reviewedAt).toLocaleString("en-PH")
                      : "an unknown date"}
                    .
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No close, similarly named candidates need review.
          </p>
        )}
      </section>
    </main>
  );
}

function AuditChangeSummary({ changes }: { changes: Record<string, unknown> }) {
  const after = asRecord(changes.after);
  const before = asRecord(changes.before);
  const summary =
    typeof after.latitude === "number" && typeof after.longitude === "number"
      ? `Coordinates: ${formatPoint(before.location)} → ${after.latitude.toFixed(6)}, ${after.longitude.toFixed(6)}.`
      : typeof changes.fieldName === "string"
        ? `${String(changes.fieldName)} marked ${String(changes.trustStatus)}.`
        : typeof changes.rateId === "string"
          ? `Rate reviewed${changes.active === false ? " inactive" : " as active"}.`
          : typeof changes.decision === "string"
            ? `Decision: ${String(changes.decision).replaceAll("_", " ")}.`
            : Array.isArray(changes.fields)
              ? `Updated: ${changes.fields.join(", ")}.`
              : typeof changes.canonicalAreaName === "string"
                ? `Assigned ${changes.canonicalAreaName}.`
                : "Change details recorded.";
  return <p className="mt-1 text-xs text-muted-foreground">{summary}</p>;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatPoint(value: unknown) {
  const point = asRecord(value);
  return typeof point.latitude === "number" &&
    typeof point.longitude === "number"
    ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
    : "not set";
}

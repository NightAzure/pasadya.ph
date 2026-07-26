import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getFilterProfile,
  orphanedCategoryFilters,
  stripOrphanedCategoryFilters,
  unknownDataRule,
} from "@/modules/search/filter-registry";
import {
  searchQueryFromWorkspaceParams,
  workspaceUrl,
  workspaceUpdatesFromQuery,
} from "@/modules/search/workspace-contract";
import type { SearchQuery } from "@/modules/search/contracts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 8 verification failed: ${message}`);
}

function read(file: string) {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

function run() {
  const lodging = getFilterProfile(["resort"]);
  assert(lodging.controls.has("rooms"), "resort profile hides rooms");
  assert(lodging.controls.has("stayMode"), "resort profile hides stay mode");
  assert(
    lodging.controls.has("cancellation"),
    "resort profile hides cancellation",
  );
  assert(
    lodging.priceBasisLabel.toLowerCase().includes("stay"),
    "lodging price basis is unlabeled",
  );

  const dining = getFilterProfile(["restaurant"]);
  assert(dining.controls.has("cuisine"), "restaurant profile hides cuisine");
  assert(dining.controls.has("visitAt"), "restaurant profile hides visit time");
  assert(!dining.controls.has("rooms"), "restaurant profile exposes rooms");
  assert(
    dining.priceBasisLabel.toLowerCase().includes("person") ||
      dining.priceBasisLabel.toLowerCase().includes("party"),
    "dining price basis is unlabeled",
  );

  const experience = getFilterProfile(["activity"]);
  assert(
    experience.controls.has("durationHours"),
    "activity profile hides duration",
  );
  assert(
    experience.controls.has("rateTypes"),
    "activity profile hides pricing type",
  );

  const mixed = getFilterProfile(["resort", "restaurant"]);
  assert(mixed.group === "mixed", "mixed categories are not detected");
  assert(
    mixed.explanation?.includes("Category-specific"),
    "mixed categories lack an explanation",
  );
  assert(!mixed.controls.has("cuisine"), "mixed profile still shows cuisine");

  for (const control of [
    "verifiedTotal",
    "available",
    "visitAt",
    "cuisine",
    "route",
    "amenities",
  ] as const)
    assert(
      unknownDataRule(control).toLowerCase().includes("exclu") ||
        unknownDataRule(control).toLowerCase().includes("never") ||
        unknownDataRule(control).toLowerCase().includes("pass"),
      `${control} lacks an unknown-data rule`,
    );

  const preserved: SearchQuery = {
    limit: 20,
    sort: "best_match",
    categories: ["restaurant"],
    rateTypes: ["overnight"],
    attributes: [{ key: "cuisine", value: "seafood" }],
    rooms: 2,
  };
  const orphans = orphanedCategoryFilters(
    preserved,
    getFilterProfile(preserved.categories),
  );
  assert(
    orphans.includes("Stay or pricing type") && orphans.includes("Rooms"),
    "orphaned lodging filters are not detected for restaurants",
  );
  const stripped = stripOrphanedCategoryFilters(preserved);
  assert(
    !stripped.rateTypes && !stripped.rooms && stripped.attributes?.[0]?.key === "cuisine",
    "orphan stripping did not preserve valid cuisine while clearing lodging fields",
  );

  const urlQuery = searchQueryFromWorkspaceParams({
    category: "resort",
    rateType: ["overnight", "day_use"],
    cancellation: ["flexible"],
    attr: ["day_use:true", "overnight:true"],
    available: "1",
    checkIn: "2026-08-01",
    checkOut: "2026-08-02",
    pax: "2",
    rooms: "1",
    amenity: ["pool"],
  });
  assert(urlQuery.rateTypes?.includes("overnight"), "rateType URL mapping failed");
  assert(
    urlQuery.cancellationPolicies?.includes("flexible"),
    "cancellation URL mapping failed",
  );
  assert(urlQuery.available === true, "available URL mapping failed");
  assert(
    urlQuery.attributes?.some((attribute) => attribute.key === "day_use"),
    "stay-mode attribute URL mapping failed",
  );

  const restaurantUrl = searchQueryFromWorkspaceParams({
    category: "restaurant",
    attr: ["cuisine:filipino"],
    visitDate: "2026-08-01",
    visitTime: "18:30",
  });
  assert(
    restaurantUrl.attributes?.[0]?.value === "filipino",
    "cuisine URL mapping failed",
  );
  assert(
    restaurantUrl.visitAt?.includes("2026-08-01T18:30"),
    "visit time URL mapping failed",
  );

  const serialized = workspaceUpdatesFromQuery(urlQuery);
  const publicUrl = workspaceUrl(new URLSearchParams(), serialized);
  assert(publicUrl.includes("rateType=overnight"), "rateType not shareable");
  assert(
    publicUrl.includes("cancellation=flexible"),
    "cancellation not shareable",
  );
  assert(
    !/(origin|lat|lng|maxDurationMin|maxFare|routeRequired)=/.test(publicUrl),
    "route or coordinate state leaked into public URL",
  );

  const registry = read("src/modules/search/filter-registry.ts");
  const sheet = read("src/components/discovery/search-filter-sheet.tsx");
  const workspace = read("src/components/discovery/search-workspace.tsx");
  assert(
    registry.includes("getFilterProfile"),
    "adaptive filter registry is missing",
  );
  assert(
    sheet.includes("getFilterProfile"),
    "filter sheet does not consume the registry",
  );
  assert(
    sheet.includes("unknownDataRule"),
    "filter sheet omits unknown-data guidance",
  );
  assert(
    sheet.includes("facets?.amenities") || sheet.includes("counts={facets"),
    "filter sheet does not display facet counts",
  );
  assert(
    sheet.includes("Clear invalid filters"),
    "orphan confirmation flow is missing",
  );
  assert(
    workspace.includes("SearchFilterSheet"),
    "workspace does not mount the adaptive filter sheet",
  );
  assert(
    workspace.includes("sessionRoute"),
    "session route draft is missing from the workspace",
  );

  console.log("Search 2.0 Phase 8 adaptive filter verification passed");
}

run();

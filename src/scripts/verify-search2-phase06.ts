import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  paramsFromSearchParams,
  searchQueryFromWorkspaceParams,
  workspaceUrl,
} from "@/modules/search/workspace-contract";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 6 verification failed: ${message}`);
}

function run() {
  const legacy = searchQueryFromWorkspaceParams({
    q: "Samal beach",
    area: "samal",
    category: "resort",
    amenity: ["pool", "wifi"],
    checkIn: "2026-08-01",
    checkOut: "2026-08-03",
    pax: "4",
    requestedUnits: "2",
    maxPrice: "1500",
    rating: "4.5",
    bookingMode: "instant",
    crowd: "quiet",
    dot: "1",
    sort: "price-asc",
  });
  assert(legacy.text === "Samal beach", "legacy q did not map to text");
  assert(legacy.area === "Samal", "legacy area did not map to a public area");
  assert(legacy.categories?.[0] === "resort", "legacy category was lost");
  assert(legacy.rooms === 2, "legacy requestedUnits did not map to rooms");
  assert(
    legacy.verifiedTotal?.max === 150_000,
    "legacy max price did not become a contextual verified total",
  );
  assert(legacy.sort === "verified_total", "legacy sort did not map");

  const incomplete = searchQueryFromWorkspaceParams({
    checkIn: "2026-08-01",
    maxPrice: "1500",
  });
  assert(
    !incomplete.verifiedTotal && !incomplete.checkIn,
    "incomplete trip context must not send an invalid verified-price query",
  );

  const publicUrl = workspaceUrl(
    new URLSearchParams(
      "q=samal&amenity=pool&lat=7.1&lng=125.7&bounds=unsafe&locationPermission=granted",
    ),
    { amenity: ["wifi"], maxTotal: "3000" },
  );
  assert(
    publicUrl.includes("q=samal"),
    "safe legacy URL state was not preserved",
  );
  assert(
    publicUrl.includes("amenity=wifi"),
    "repeated URL state was not updated",
  );
  assert(
    !/(lat|lng|bounds|locationPermission|origin|radius)=/.test(publicUrl),
    "precise location or permission state leaked into a public URL",
  );
  assert(
    searchQueryFromWorkspaceParams(
      paramsFromSearchParams(new URLSearchParams(publicUrl.split("?")[1])),
    ).text === "samal",
    "public URL did not round-trip through the workspace adapter",
  );

  const workspace = read("src/components/discovery/search-workspace.tsx");
  const filterSheet = read("src/components/discovery/search-filter-sheet.tsx");
  const page = read("src/app/(public)/search/page.tsx");
  assert(
    workspace.includes('fetch("/api/search"'),
    "workspace bypasses the typed API",
  );
  assert(
    filterSheet.includes("<dialog") || workspace.includes("<dialog"),
    "advanced filters are not a modal sheet",
  );
  assert(
    workspace.includes('aria-live="polite"'),
    "result count has no live announcement",
  );
  assert(
    !workspace.includes("MapPanel"),
    "Phase 6 workspace includes map implementation",
  );
  assert(
    page.includes("<SearchWorkspace"),
    "search route does not hydrate the workspace",
  );
  console.log("Search 2.0 Phase 6 workspace verification passed");
}

function read(file: string) {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

run();

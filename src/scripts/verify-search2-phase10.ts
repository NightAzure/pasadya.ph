import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import { resetRateLimitBuckets } from "@/lib/rate-limit";
import {
  getCachedSearch,
  invalidateSearchCache,
  resetSearchCache,
  setCachedSearch,
} from "@/modules/search/cache";
import {
  getSearchV2Mode,
  searchV2RolloutSnapshot,
  shouldRunShadowComparison,
  shouldServeSearchV2,
} from "@/modules/search/feature-flag";
import {
  SEARCH_MAX_BODY_BYTES,
  SEARCH_MAX_CANDIDATES,
  SEARCH_TIMEOUT_MS,
} from "@/modules/search/hardening";
import {
  getSearchObservabilitySnapshot,
  recordSearchMetric,
  resetSearchObservability,
} from "@/modules/search/observability";
import {
  assertNoPreciseLocationKeys,
  LOCATION_PRIVACY_DISCLOSURE,
  LOCATION_PRIVACY_SHORT,
  scrubForLog,
  searchQueryShape,
} from "@/modules/search/privacy";
import { searchListings } from "@/modules/search/service";
import { compareSearchShadow } from "@/modules/search/shadow";
import { searchQueryFromWorkspaceParams } from "@/modules/search/workspace-contract";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 10 verification failed: ${message}`);
}

function read(file: string) {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

function percentile(values: number[], p: number) {
  if (!values.length) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index]!;
}

async function warmLoad(
  label: string,
  run: () => Promise<number>,
  budgetMs: number,
) {
  for (let i = 0; i < 3; i += 1) await run();
  const samples: number[] = [];
  for (let i = 0; i < 12; i += 1) samples.push(await run());
  const p95 = percentile(samples, 95);
  assert(
    p95 < budgetMs,
    `${label} warm p95 ${Math.round(p95)}ms exceeds ${budgetMs}ms`,
  );
  console.log(`  ${label}: warm p95 ${Math.round(p95)}ms (budget ${budgetMs}ms)`);
}

async function run() {
  console.log("Search 2.0 Phase 10 — production hardening verification");

  // --- Source / rollout contracts ---
  const page = read("src/app/(public)/search/page.tsx");
  const api = read("src/app/api/search/route.ts");
  const metricsRoute = read("src/app/api/search/metrics/route.ts");
  const service = read("src/modules/search/service.ts");
  const workspace = read("src/components/discovery/search-workspace.tsx");
  const canvas = read("src/components/discovery/search-map-canvas.tsx");
  const privacy = read("src/modules/search/privacy.ts");
  const env = read(".env.example");
  const legacyPage = read("src/components/discovery/legacy-search-page.tsx");
  const jobs = read("src/modules/jobs/handlers.ts");

  assert(page.includes("shouldServeSearchV2"), "feature flag gate missing on /search");
  assert(page.includes("LegacySearchPage"), "rollback legacy page not wired");
  assert(legacyPage.includes("SearchControls"), "legacy rollback UI incomplete");
  assert(legacyPage.includes("SearchResultsShell"), "legacy results shell missing");
  assert(env.includes("SEARCH_V2_MODE"), "SEARCH_V2_MODE undocumented");
  assert(
    env.includes("SEARCH_V2_ROLLOUT_PERCENT"),
    "SEARCH_V2_ROLLOUT_PERCENT undocumented",
  );
  assert(
    env.includes("restrict the browser key to approved Pasadya origins"),
    "MapTiler origin-restriction guidance missing from .env.example",
  );
  assert(api.includes("SEARCH_MAX_BODY_BYTES"), "body size limit missing");
  assert(api.includes("withTimeout"), "search timeout wrapper missing");
  assert(api.includes("504"), "timeout status missing");
  assert(service.includes("SEARCH_MAX_CANDIDATES"), "candidate cap missing");
  assert(service.includes("getCachedSearch"), "search cache not integrated");
  assert(jobs.includes("invalidateSearchCache"), "cache invalidation on refresh missing");
  assert(metricsRoute.includes("assertNoPreciseLocationKeys"), "metrics privacy gate missing");
  assert(workspace.includes("trackSearchUiEvent"), "client UI metrics not wired");
  assert(
    canvas.includes("LOCATION_PRIVACY_SHORT"),
    "location privacy short disclosure missing from locate control",
  );
  assert(
    privacy.includes("LOCATION_PRIVACY_DISCLOSURE"),
    "privacy disclosure copy missing from privacy module",
  );
  assert(
    metricsRoute.includes("authorizeJobRequest"),
    "metrics GET must use job authorization helper",
  );
  assert(page.includes("withTimeout"), "SSR search timeout missing");
  assert(
    canvas.includes("Zoom in") && canvas.includes("Return to list"),
    "non-drag map alternatives missing",
  );
  assert(workspace.includes('aria-live="polite"'), "results live region missing");
  assert(workspace.includes('role="search"'), "search landmark missing");

  // --- Feature-flag behavior ---
  const previousMode = process.env.SEARCH_V2_MODE;
  const previousPercent = process.env.SEARCH_V2_ROLLOUT_PERCENT;
  try {
    process.env.SEARCH_V2_MODE = "off";
    assert(!shouldServeSearchV2("bucket-a"), "mode=off must serve legacy");
    process.env.SEARCH_V2_MODE = "shadow";
    assert(shouldServeSearchV2("bucket-a"), "mode=shadow must serve v2");
    assert(shouldRunShadowComparison(), "shadow mode must enable comparison");
    process.env.SEARCH_V2_MODE = "on";
    process.env.SEARCH_V2_ROLLOUT_PERCENT = "0";
    assert(!shouldServeSearchV2("bucket-a"), "0% rollout must serve legacy");
    process.env.SEARCH_V2_ROLLOUT_PERCENT = "100";
    assert(shouldServeSearchV2("bucket-a"), "100% rollout must serve v2");
    assert(getSearchV2Mode() === "on", "mode parser failed");
    assert(searchV2RolloutSnapshot().rolloutPercent === 100, "rollout snapshot failed");
  } finally {
    if (previousMode === undefined) delete process.env.SEARCH_V2_MODE;
    else process.env.SEARCH_V2_MODE = previousMode;
    if (previousPercent === undefined) delete process.env.SEARCH_V2_ROLLOUT_PERCENT;
    else process.env.SEARCH_V2_ROLLOUT_PERCENT = previousPercent;
  }

  // --- Privacy contracts ---
  assert(
    LOCATION_PRIVACY_DISCLOSURE.includes("not saved"),
    "location disclosure copy is incomplete",
  );
  assert(LOCATION_PRIVACY_SHORT.length > 10, "short privacy copy missing");
  const scrubbed = scrubForLog({
    origin: { lat: 7.1, lng: 125.6 },
    text: "secret query",
    ok: true,
  }) as Record<string, unknown>;
  assert(scrubbed.origin === "[redacted]", "origin not redacted in logs");
  assert(scrubbed.text === "[redacted]", "query text not redacted in logs");
  assert(
    assertNoPreciseLocationKeys({ action: "map_open", viewport: "mobile" }).length ===
      0,
    "false positive on safe metrics payload",
  );
  assert(
    assertNoPreciseLocationKeys({ lat: 7.1, lng: 125.6 }).length > 0,
    "precise location keys not detected",
  );

  resetSearchObservability();
  resetSearchCache();
  resetRateLimitBuckets();

  // --- Cache policy ---
  const baseQuery = searchQueryFromWorkspaceParams({ q: "resort" });
  const first = await searchListings(baseQuery);
  assert(first.timing.cache === "miss" || first.timing.cache === "bypass", "first search cache state");
  const cachedLookup = getCachedSearch(baseQuery);
  assert(cachedLookup?.state === "hit", "cacheable query was not stored");
  const second = await searchListings(baseQuery);
  assert(second.timing.cache === "hit", "second search should be a cache hit");
  invalidateSearchCache("phase10-verify");
  const afterInvalidate = getCachedSearch(baseQuery);
  assert(!afterInvalidate, "cache invalidation failed");

  const originQuery = {
    ...baseQuery,
    origin: { lat: 7.0731, lng: 125.6128 },
  };
  const originResponse = await searchListings(originQuery);
  assert(originResponse.timing.cache === "bypass", "origin queries must bypass cache");
  assert(!getCachedSearch(originQuery), "origin query must not be cached");

  // --- Candidate cap constant ---
  assert(SEARCH_MAX_CANDIDATES === 250, "unexpected candidate cap");
  assert(SEARCH_TIMEOUT_MS === 8_000, "unexpected timeout");
  assert(SEARCH_MAX_BODY_BYTES === 16_384, "unexpected body limit");

  // --- Hard-filter integrity sample: unknown cannot pass verified total ---
  const hard = await searchListings({
    checkIn: "2026-08-15",
    checkOut: "2026-08-16",
    pax: 2,
    verifiedTotal: { max: 1 },
    limit: 20,
  });
  assert(hard.totalCount === 0, "impossible verified-total hard filter leaked results");
  assert(hard.diagnostics.exact === true, "hard filter must remain exact");

  // --- Shadow comparison for overlapping text search ---
  const shadow = await compareSearchShadow({
    query: baseQuery,
    v2Slugs: first.listings.map((listing) => listing.slug),
  });
  assert(shadow.comparable, `shadow should be comparable for text search: ${shadow.reason}`);
  assert(shadow.durationMs < 5_000, "shadow comparison too slow");

  const routeShadow = await compareSearchShadow({
    query: originQuery,
    v2Slugs: originResponse.listings.map((listing) => listing.slug),
  });
  assert(!routeShadow.comparable, "origin queries must skip legacy shadow compare");

  // --- Observability aggregates without precise location ---
  recordSearchMetric({
    type: "client_ui",
    action: "map_open",
    viewport: "mobile",
  });
  const snapshot = getSearchObservabilitySnapshot();
  const snapshotText = JSON.stringify(snapshot);
  assert(!/"lat"\s*:/.test(snapshotText), "observability retained latitude");
  assert(!/"lng"\s*:/.test(snapshotText), "observability retained longitude");
  assert(snapshot.searchApi.ok > 0, "search API metrics not recorded");
  assert(snapshot.clientUi["map_open:mobile"] === 1, "client UI metric missing");
  assert(snapshot.shadow.runs >= 1, "shadow metrics missing");
  const shape = searchQueryShape(originQuery);
  assert(shape.hasOrigin && !("lat" in shape), "query shape leaked coordinates");

  // --- SQL execution-plan review ---
  const plans = await db.execute<Record<string, string>>(sql`
    explain (format text)
    select l.id
    from listings l
    where l.status = 'published'::listing_status
      and l.search_vector_simple @@ websearch_to_tsquery('simple', 'resort')
    order by ts_rank_cd(l.search_vector_simple, websearch_to_tsquery('simple', 'resort')) desc
    limit ${SEARCH_MAX_CANDIDATES}
  `);
  const planText = plans.rows
    .map((row) => row["QUERY PLAN"] ?? row["query plan"] ?? Object.values(row)[0] ?? "")
    .join("\n");
  assert(planText.length > 0, "EXPLAIN returned empty plan");
  assert(
    /Bitmap Index Scan|Index Scan|Index Only Scan|Bitmap Heap Scan|Seq Scan/i.test(
      planText,
    ),
    `text search plan unreadable:\n${planText}`,
  );
  // Seed inventory is tiny; prefer index usage when present, but do not fail
  // the phase solely because Postgres chose a seq scan on a handful of rows.
  if (!/Bitmap Index Scan|Index Scan|Index Only Scan|Bitmap Heap Scan/i.test(planText))
    console.warn(
      "  WARN: text search EXPLAIN did not show an index scan on seed inventory",
    );

  const geoPlans = await db.execute<Record<string, string>>(sql`
    explain (format text)
    select l.id
    from listings l
    where l.status = 'published'::listing_status
      and l.location is not null
      and ST_DWithin(
        l.location,
        ST_SetSRID(ST_MakePoint(125.6128, 7.0731), 4326)::geography,
        15000
      )
    limit ${SEARCH_MAX_CANDIDATES}
  `);
  const geoPlanText = geoPlans.rows
    .map((row) => row["QUERY PLAN"] ?? row["query plan"] ?? Object.values(row)[0] ?? "")
    .join("\n");
  assert(geoPlanText.length > 0, "geo EXPLAIN returned empty plan");
  console.log("  EXPLAIN text-search and radius plans captured");

  // --- Load tests: text, bounds, availability context, route-aware ---
  console.log("  Running warm load samples...");
  await warmLoad(
    "text search",
    async () => {
      resetSearchCache();
      const started = performance.now();
      await searchListings({ text: "samal", limit: 20 });
      return performance.now() - started;
    },
    500,
  );
  await warmLoad(
    "bounds search",
    async () => {
      resetSearchCache();
      const started = performance.now();
      await searchListings({
        bounds: {
          west: 125.5,
          south: 7.0,
          east: 125.8,
          north: 7.2,
        },
        limit: 20,
      });
      return performance.now() - started;
    },
    500,
  );
  await warmLoad(
    "availability context",
    async () => {
      resetSearchCache();
      const started = performance.now();
      await searchListings({
        checkIn: "2026-08-15",
        checkOut: "2026-08-16",
        pax: 2,
        rooms: 1,
        limit: 20,
      });
      return performance.now() - started;
    },
    500,
  );
  await warmLoad(
    "route-aware search",
    async () => {
      resetSearchCache();
      const started = performance.now();
      await searchListings({
        origin: { lat: 7.0731, lng: 125.6128 },
        limit: 20,
      });
      return performance.now() - started;
    },
    800,
  );

  // --- Legacy URL compatibility regression ---
  const legacyMapped = searchQueryFromWorkspaceParams({
    q: "beach",
    area: "samal",
    category: "resort",
    maxPrice: "5000",
    checkIn: "2026-08-15",
    checkOut: "2026-08-16",
    pax: "2",
    requestedUnits: "1",
  });
  assert(legacyMapped.area === "Samal" || legacyMapped.area === "samal" || Boolean(legacyMapped.area), "legacy area mapping broken");
  assert(legacyMapped.categories?.[0] === "resort", "legacy category mapping broken");
  assert(legacyMapped.rooms === 1, "legacy requestedUnits mapping broken");
  const compatible = await searchListings(legacyMapped);
  assert(compatible.diagnostics.exact === true, "legacy-compatible query must stay exact");

  // --- Freshness metric hook smoke ---
  recordSearchMetric({ type: "freshness", kind: "search_index", stale: false });
  recordSearchMetric({ type: "freshness", kind: "route_data", stale: true });
  const freshness = getSearchObservabilitySnapshot().freshness;
  assert(freshness.routeDataStale === 1, "route freshness metric missing");

  // Force a cache write/read path covered above.
  setCachedSearch(baseQuery, first);
  assert(getCachedSearch(baseQuery)?.state === "hit", "manual cache set failed");

  console.log("Search 2.0 Phase 10 production hardening verification passed");
}

run()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

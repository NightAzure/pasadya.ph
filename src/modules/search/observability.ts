import {
  searchQueryShape,
  scrubForLog,
  type SearchQueryShape,
} from "@/modules/search/privacy";
import type { SearchQuery } from "@/modules/search/contracts";
import type { SearchCacheState } from "@/modules/search/hardening";

/**
 * First-party aggregate search metrics (PD-032).
 * Never stores raw query text, coordinates, bounds, IP, user ids, or booking data.
 */

export type SearchMetricEvent =
  | {
      type: "search_api";
      ok: boolean;
      durationMs: number;
      cache: SearchCacheState;
      zeroResult: boolean;
      nearMatchShown: boolean;
      routeAware: boolean;
      candidateCount: number;
      resultCount: number;
      unknownPriceExposure: number;
      unknownRouteExposure: number;
      shape: SearchQueryShape;
      errorClass?: "validation" | "timeout" | "rate_limit" | "provider" | "unknown";
    }
  | {
      type: "client_ui";
      action:
        | "filter_apply"
        | "filter_remove"
        | "map_open"
        | "list_open"
        | "search_this_area"
        | "result_click"
        | "booking_click"
        | "tile_failure"
        | "geocoder_failure";
      viewport: "mobile" | "tablet" | "desktop";
    }
  | {
      type: "shadow_compare";
      overlapCount: number;
      v2OnlyCount: number;
      legacyOnlyCount: number;
      durationMs: number;
    }
  | {
      type: "freshness";
      kind: "search_index" | "route_data";
      stale: boolean;
    };

type Bucket = {
  count: number;
  totalMs: number;
  maxMs: number;
};

type AggregateState = {
  startedAt: number;
  searchApi: {
    ok: number;
    error: number;
    zeroResult: number;
    nearMatch: number;
    routeAware: number;
    cacheHit: number;
    cacheMiss: number;
    cacheBypass: number;
    unknownPriceExposure: number;
    unknownRouteExposure: number;
    latency: Bucket;
    routeLatency: Bucket;
    errors: Record<string, number>;
  };
  clientUi: Record<string, number>;
  shadow: {
    runs: number;
    overlap: number;
    v2Only: number;
    legacyOnly: number;
  };
  freshness: {
    searchIndexStale: number;
    routeDataStale: number;
  };
};

const state: AggregateState = emptyState();

export function recordSearchMetric(event: SearchMetricEvent) {
  if (event.type === "search_api") {
    if (event.ok) state.searchApi.ok += 1;
    else {
      state.searchApi.error += 1;
      if (event.errorClass)
        state.searchApi.errors[event.errorClass] =
          (state.searchApi.errors[event.errorClass] ?? 0) + 1;
    }
    if (event.zeroResult) state.searchApi.zeroResult += 1;
    if (event.nearMatchShown) state.searchApi.nearMatch += 1;
    if (event.routeAware) {
      state.searchApi.routeAware += 1;
      bump(state.searchApi.routeLatency, event.durationMs);
    }
    if (event.cache === "hit") state.searchApi.cacheHit += 1;
    else if (event.cache === "miss") state.searchApi.cacheMiss += 1;
    else if (event.cache === "bypass") state.searchApi.cacheBypass += 1;
    state.searchApi.unknownPriceExposure += event.unknownPriceExposure;
    state.searchApi.unknownRouteExposure += event.unknownRouteExposure;
    bump(state.searchApi.latency, event.durationMs);
    return;
  }
  if (event.type === "client_ui") {
    const key = `${event.action}:${event.viewport}`;
    state.clientUi[key] = (state.clientUi[key] ?? 0) + 1;
    return;
  }
  if (event.type === "shadow_compare") {
    state.shadow.runs += 1;
    state.shadow.overlap += event.overlapCount;
    state.shadow.v2Only += event.v2OnlyCount;
    state.shadow.legacyOnly += event.legacyOnlyCount;
    return;
  }
  if (event.kind === "search_index" && event.stale)
    state.freshness.searchIndexStale += 1;
  if (event.kind === "route_data" && event.stale)
    state.freshness.routeDataStale += 1;
}

export function recordSearchApiFromQuery(options: {
  query: SearchQuery;
  ok: boolean;
  durationMs: number;
  cache: SearchCacheState;
  zeroResult: boolean;
  nearMatchShown?: boolean;
  candidateCount: number;
  resultCount: number;
  unknownPriceExposure: number;
  unknownRouteExposure: number;
  errorClass?: SearchMetricEvent extends { type: "search_api" }
    ? SearchMetricEvent["errorClass"]
    : never;
}) {
  recordSearchMetric({
    type: "search_api",
    ok: options.ok,
    durationMs: options.durationMs,
    cache: options.cache,
    zeroResult: options.zeroResult,
    nearMatchShown: options.nearMatchShown ?? false,
    routeAware: Boolean(options.query.origin),
    candidateCount: options.candidateCount,
    resultCount: options.resultCount,
    unknownPriceExposure: options.unknownPriceExposure,
    unknownRouteExposure: options.unknownRouteExposure,
    shape: searchQueryShape(options.query),
    errorClass: options.errorClass,
  });
}

export function getSearchObservabilitySnapshot() {
  const latency = state.searchApi.latency;
  const route = state.searchApi.routeLatency;
  return {
    windowStartedAt: new Date(state.startedAt).toISOString(),
    searchApi: {
      ...state.searchApi,
      latency: summarize(latency),
      routeLatency: summarize(route),
    },
    clientUi: { ...state.clientUi },
    shadow: { ...state.shadow },
    freshness: { ...state.freshness },
  };
}

/** Privacy-safe structured log line — shape only, never coordinates/text. */
export function logSearchOperational(event: {
  level?: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}) {
  const payload = {
    service: "search-v2",
    level: event.level ?? "info",
    message: event.message,
    details: scrubForLog(event.details ?? {}),
    at: new Date().toISOString(),
  };
  const line = JSON.stringify(payload);
  if (event.level === "error") console.error(line);
  else if (event.level === "warn") console.warn(line);
  else console.info(line);
}

export function resetSearchObservability() {
  Object.assign(state, emptyState());
}

function emptyState(): AggregateState {
  return {
    startedAt: Date.now(),
    searchApi: {
      ok: 0,
      error: 0,
      zeroResult: 0,
      nearMatch: 0,
      routeAware: 0,
      cacheHit: 0,
      cacheMiss: 0,
      cacheBypass: 0,
      unknownPriceExposure: 0,
      unknownRouteExposure: 0,
      latency: { count: 0, totalMs: 0, maxMs: 0 },
      routeLatency: { count: 0, totalMs: 0, maxMs: 0 },
      errors: {},
    },
    clientUi: {},
    shadow: { runs: 0, overlap: 0, v2Only: 0, legacyOnly: 0 },
    freshness: { searchIndexStale: 0, routeDataStale: 0 },
  };
}

function bump(bucket: Bucket, durationMs: number) {
  bucket.count += 1;
  bucket.totalMs += durationMs;
  bucket.maxMs = Math.max(bucket.maxMs, durationMs);
}

function summarize(bucket: Bucket) {
  return {
    count: bucket.count,
    avgMs: bucket.count ? Math.round(bucket.totalMs / bucket.count) : 0,
    maxMs: bucket.maxMs,
  };
}

/** Phase 10 query-cost and provider-hardening limits for Search 2.0. */

/** Maximum published candidates loaded before quote/route evaluation. */
export const SEARCH_MAX_CANDIDATES = 250;

/** Wall-clock budget for a single search evaluation (ms). */
export const SEARCH_TIMEOUT_MS = 8_000;

/** Reject oversized JSON bodies before parsing. */
export const SEARCH_MAX_BODY_BYTES = 16_384;

/** Short TTL for cacheable anonymous searches (ms). */
export const SEARCH_CACHE_TTL_MS = 30_000;

/** POST /api/search rate limit. */
export const SEARCH_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

/** GET suggestions rate limit. */
export const SUGGESTION_RATE_LIMIT = { limit: 90, windowMs: 60_000 } as const;

/** Client metrics ingest rate limit. */
export const SEARCH_METRICS_RATE_LIMIT = { limit: 120, windowMs: 60_000 } as const;

export type SearchCacheState = "hit" | "miss" | "bypass" | "none";

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "Search timed out.",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

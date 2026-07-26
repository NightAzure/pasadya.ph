import type { SearchQuery, SearchResponse } from "@/modules/search/contracts";
import { queryFingerprint } from "@/modules/search/contracts";
import {
  SEARCH_CACHE_TTL_MS,
  type SearchCacheState,
} from "@/modules/search/hardening";

type CacheEntry = {
  expiresAt: number;
  response: SearchResponse;
};

const memoryCache = new Map<string, CacheEntry>();
let generation = 0;

/**
 * Personalized or paginated queries bypass cache: origin coordinates, cursors,
 * and route ceilings must never be retained as cache keys or values beyond the
 * request lifetime.
 */
export function isSearchCacheable(query: SearchQuery): boolean {
  if (query.cursor) return false;
  if (query.origin) return false;
  if (query.radius) return false;
  if (query.bounds) return false;
  if (query.route) return false;
  return true;
}

export function getCachedSearch(
  query: SearchQuery,
): { response: SearchResponse; state: SearchCacheState } | null {
  if (!isSearchCacheable(query)) return null;
  const key = cacheKey(query);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return {
    response: {
      ...entry.response,
      timing: {
        ...entry.response.timing,
        cache: "hit",
        durationMs: 0,
        candidateMs: 0,
        quoteMs: 0,
      },
    },
    state: "hit",
  };
}

export function setCachedSearch(query: SearchQuery, response: SearchResponse) {
  if (!isSearchCacheable(query)) return;
  const key = cacheKey(query);
  memoryCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    response: {
      ...response,
      timing: { ...response.timing, cache: "miss" },
    },
  });
  if (memoryCache.size > 500) pruneExpired();
}

export function invalidateSearchCache(reason = "manual") {
  memoryCache.clear();
  generation += 1;
  return { cleared: true, generation, reason };
}

export function searchCacheStats() {
  pruneExpired();
  return {
    size: memoryCache.size,
    generation,
    ttlMs: SEARCH_CACHE_TTL_MS,
  };
}

/** Test helper. */
export function resetSearchCache() {
  memoryCache.clear();
  generation = 0;
}

function cacheKey(query: SearchQuery) {
  return `${generation}:${queryFingerprint(query)}:${query.limit}:${query.sort}`;
}

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
}

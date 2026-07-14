export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** Unique key, e.g. `uploads:userId` or `webhook:ip`. */
  key: string;
  /** Maximum requests in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

function cleanupExpired(now: number) {
  if (memoryBuckets.size < 2_000) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

/** Sliding fixed-window rate limiter with an in-memory store. Suitable for
 * single-instance development and MVP; swap for Upstash when Redis is wired. */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);
  const existing = memoryBuckets.get(options.key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    memoryBuckets.set(options.key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  memoryBuckets.set(options.key, existing);
  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

/** Clears in-memory buckets. Exported for verification scripts. */
export function resetRateLimitBuckets() {
  memoryBuckets.clear();
}

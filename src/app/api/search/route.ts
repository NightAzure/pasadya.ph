import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import {
  SEARCH_MAX_BODY_BYTES,
  SEARCH_RATE_LIMIT,
  SEARCH_TIMEOUT_MS,
  SUGGESTION_RATE_LIMIT,
  withTimeout,
} from "@/modules/search/hardening";
import {
  logSearchOperational,
  recordSearchMetric,
} from "@/modules/search/observability";
import { searchQuerySchema } from "@/modules/search/contracts";
import { shouldRunShadowComparison } from "@/modules/search/feature-flag";
import { getSearchSuggestions, searchListings } from "@/modules/search/service";
import { compareSearchShadow } from "@/modules/search/shadow";

export async function POST(request: NextRequest) {
  const limit = checkRateLimit({
    key: `search:v2:${clientIpFromRequest(request)}`,
    ...SEARCH_RATE_LIMIT,
  });
  if (!limit.allowed) {
    recordSearchMetric({
      type: "search_api",
      ok: false,
      durationMs: 0,
      cache: "none",
      zeroResult: false,
      nearMatchShown: false,
      routeAware: false,
      candidateCount: 0,
      resultCount: 0,
      unknownPriceExposure: 0,
      unknownRouteExposure: 0,
      shape: {
        hasText: false,
        categories: 0,
        hasArea: false,
        hasBounds: false,
        hasRadius: false,
        hasStay: false,
        hasVerifiedTotal: false,
        hasAvailable: false,
        amenityCount: 0,
        attributeCount: 0,
        hasOrigin: false,
        hasRouteLimits: false,
        sort: "best_match",
        limit: 20,
      },
      errorClass: "rate_limit",
    });
    return NextResponse.json(
      { error: "Search rate limit exceeded. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > SEARCH_MAX_BODY_BYTES)
      return NextResponse.json(
        { error: "Search request body is too large." },
        { status: 413, headers: rateLimitHeaders(limit) },
      );

    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json(
        { error: "Search request must be valid JSON." },
        { status: 400, headers: rateLimitHeaders(limit) },
      );
    }

    // Coordinates are accepted only in this request body. This endpoint does
    // not log or cache bodies and callers must not place them in URLs.
    const query = searchQuerySchema.parse(body);
    const response = await withTimeout(
      searchListings(query),
      SEARCH_TIMEOUT_MS,
      "Search timed out.",
    );

    if (shouldRunShadowComparison()) {
      void compareSearchShadow({
        query,
        v2Slugs: response.listings.map((listing) => listing.slug),
      }).catch((error: unknown) => {
        logSearchOperational({
          level: "warn",
          message: "shadow_compare_failed",
          details: {
            errorClass:
              error instanceof Error ? error.name : "unknown_shadow_error",
          },
        });
      });
    }

    return NextResponse.json(response, {
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    if (
      error instanceof ZodError ||
      (error instanceof Error && /cursor/.test(error.message))
    )
      return NextResponse.json(
        {
          error:
            error instanceof ZodError
              ? error.issues[0]?.message
              : error.message,
        },
        { status: 400, headers: rateLimitHeaders(limit) },
      );

    const timedOut =
      error instanceof Error && /timed out/i.test(error.message);
    logSearchOperational({
      level: "error",
      message: timedOut ? "search_timeout" : "search_unavailable",
      details: {
        errorClass: timedOut ? "timeout" : "provider",
      },
    });
    recordSearchMetric({
      type: "search_api",
      ok: false,
      durationMs: SEARCH_TIMEOUT_MS,
      cache: "none",
      zeroResult: false,
      nearMatchShown: false,
      routeAware: false,
      candidateCount: 0,
      resultCount: 0,
      unknownPriceExposure: 0,
      unknownRouteExposure: 0,
      shape: {
        hasText: false,
        categories: 0,
        hasArea: false,
        hasBounds: false,
        hasRadius: false,
        hasStay: false,
        hasVerifiedTotal: false,
        hasAvailable: false,
        amenityCount: 0,
        attributeCount: 0,
        hasOrigin: false,
        hasRouteLimits: false,
        sort: "best_match",
        limit: 20,
      },
      errorClass: timedOut ? "timeout" : "provider",
    });
    return NextResponse.json(
      {
        error: timedOut
          ? "Search took too long. Narrow filters and try again."
          : "Search is unavailable right now.",
      },
      { status: timedOut ? 504 : 503, headers: rateLimitHeaders(limit) },
    );
  }
}

export async function GET(request: NextRequest) {
  const limit = checkRateLimit({
    key: `search:suggestions:${clientIpFromRequest(request)}`,
    ...SUGGESTION_RATE_LIMIT,
  });
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Search rate limit exceeded. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  try {
    const text = request.nextUrl.searchParams.get("q") ?? "";
    if (text.length > 120)
      return NextResponse.json(
        { error: "Suggestion query is too long." },
        { status: 400, headers: rateLimitHeaders(limit) },
      );
    const suggestions = await withTimeout(
      getSearchSuggestions(text),
      SEARCH_TIMEOUT_MS,
      "Suggestions timed out.",
    );
    return NextResponse.json(
      { suggestions },
      { headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    const timedOut =
      error instanceof Error && /timed out/i.test(error.message);
    return NextResponse.json(
      {
        error: timedOut
          ? "Suggestions took too long."
          : "Suggestions are unavailable right now.",
      },
      { status: timedOut ? 504 : 503, headers: rateLimitHeaders(limit) },
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { authorizeJobRequest } from "@/modules/jobs";
import {
  SEARCH_MAX_BODY_BYTES,
  SEARCH_METRICS_RATE_LIMIT,
} from "@/modules/search/hardening";
import {
  getSearchObservabilitySnapshot,
  recordSearchMetric,
} from "@/modules/search/observability";
import { assertNoPreciseLocationKeys } from "@/modules/search/privacy";

const clientEventSchema = z
  .object({
    action: z.enum([
      "filter_apply",
      "filter_remove",
      "map_open",
      "list_open",
      "search_this_area",
      "result_click",
      "booking_click",
      "tile_failure",
      "geocoder_failure",
    ]),
    viewport: z.enum(["mobile", "tablet", "desktop"]),
  })
  .strict();

/** Privacy-safe client UI metrics. Rejects any payload that includes coordinates. */
export async function POST(request: NextRequest) {
  const limit = checkRateLimit({
    key: `search:metrics:${clientIpFromRequest(request)}`,
    ...SEARCH_METRICS_RATE_LIMIT,
  });
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Metrics rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > SEARCH_MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "Metrics payload is too large." },
      { status: 413, headers: rateLimitHeaders(limit) },
    );

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json(
      { error: "Invalid metrics payload." },
      { status: 400, headers: rateLimitHeaders(limit) },
    );
  }

  const precise = assertNoPreciseLocationKeys(body);
  if (precise.length)
    return NextResponse.json(
      { error: "Precise location fields are not accepted in metrics." },
      { status: 400, headers: rateLimitHeaders(limit) },
    );

  const parsed = clientEventSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid metrics payload." },
      { status: 400, headers: rateLimitHeaders(limit) },
    );

  recordSearchMetric({
    type: "client_ui",
    action: parsed.data.action,
    viewport: parsed.data.viewport,
  });

  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(limit) });
}

/** Aggregate snapshot for internal/job verification. No request bodies retained. */
export async function GET(request: NextRequest) {
  const authorization = authorizeJobRequest(request);
  if (!authorization.authorized)
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );

  const limit = checkRateLimit({
    key: `search:metrics:read:${clientIpFromRequest(request)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Metrics rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );

  return NextResponse.json(getSearchObservabilitySnapshot(), {
    headers: rateLimitHeaders(limit),
  });
}

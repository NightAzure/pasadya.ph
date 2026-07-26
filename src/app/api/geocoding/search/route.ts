import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { AuthorizationError } from "@/lib/rbac";
import { searchLaunchAddresses } from "@/modules/geocoding";
import { getPortalActor } from "@/modules/portal/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await getPortalActor();
    const limit = checkRateLimit({
      key: `geocoding:search:${actor.id}:${clientIpFromRequest(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Address search rate limit exceeded. Try again shortly." },
        { status: 429, headers: rateLimitHeaders(limit) },
      );
    }

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const result = await searchLaunchAddresses(query);
    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid address query." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Address search is unavailable right now.",
      },
      { status: 502 },
    );
  }
}

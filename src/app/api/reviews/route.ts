import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/rbac";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getPortalActor } from "@/modules/portal/service";
import {
  createReview,
  listReviews,
  reviewInputSchema,
} from "@/modules/community/service";

function errorResponse(error: unknown) {
  const status =
    error instanceof AuthorizationError
      ? error.message === "Unauthorized"
        ? 401
        : 403
      : error instanceof ZodError
        ? 400
        : error instanceof Error && error.message.includes("not found")
          ? 404
          : error instanceof Error &&
              (error.message.includes("already") ||
                error.message.includes("limit"))
            ? 409
            : 400;
  return NextResponse.json(
    {
      error:
        error instanceof ZodError
          ? "Review details are not valid."
          : error instanceof Error
            ? error.message
            : "Review could not be saved.",
      ...(error instanceof ZodError ? { issues: error.flatten() } : {}),
    },
    { status },
  );
}

export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get("listingId");
  const parsed = reviewInputSchema.shape.listingId.safeParse(listingId);
  if (!parsed.success)
    return NextResponse.json(
      { error: "listingId is required." },
      { status: 400 },
    );
  try {
    return NextResponse.json({ reviews: await listReviews(parsed.data) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getPortalActor();
    const limit = checkRateLimit({
      key: `reviews:create:${actor.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Review rate limit exceeded." },
        { status: 429, headers: rateLimitHeaders(limit) },
      );
    }
    const parsed = reviewInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return errorResponse(parsed.error);
    const result = await createReview(parsed.data, actor.id);
    return NextResponse.json(result, {
      status: 201,
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { submitListingEdit } from "@/modules/listings/moderation";
import { AuthorizationError } from "@/lib/rbac";
import { getPortalActor } from "@/modules/portal/service";

type RouteContext = { params: Promise<{ listingId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = await getPortalActor();
    const { listingId } = await params;
    const body = await request.json().catch(() => null);
    const result = await submitListingEdit(
      { ...(body ?? {}), listingId },
      actor.id,
    );
    return NextResponse.json({ request: result }, { status: 201 });
  } catch (error) {
    return requestError(error, "Listing edit request could not be submitted.");
  }
}

function requestError(error: unknown, fallback: string) {
  const status =
    error instanceof AuthorizationError
      ? error.message === "Forbidden"
        ? 403
        : 401
      : error instanceof ZodError
        ? 400
        : error instanceof Error &&
            error.message.includes("already under review")
          ? 409
          : error instanceof Error && error.message === "Listing not found."
            ? 404
            : 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status },
  );
}

import { NextResponse } from "next/server";

import { getAdminActor, updateAdminListing } from "@/modules/admin";

import { adminErrorResponse, readJson } from "../../_errors";

type RouteContext = { params: Promise<{ listingId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  return update(request, params);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return update(request, params);
}

async function update(
  request: Request,
  params: Promise<{ listingId: string }>,
) {
  try {
    const actor = await getAdminActor("moderator");
    const { listingId } = await params;
    const listing = await updateAdminListing(
      listingId,
      await readJson(request),
      actor.id,
    );
    return NextResponse.json({ listing });
  } catch (error) {
    return adminErrorResponse(error, "Admin listing could not be updated.");
  }
}

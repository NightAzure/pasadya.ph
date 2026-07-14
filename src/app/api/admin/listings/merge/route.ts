import { NextResponse } from "next/server";

import { getAdminActor, mergeAdminListings } from "@/modules/admin";

import { adminErrorResponse } from "../../_errors";

export async function POST(request: Request) {
  try {
    const actor = await getAdminActor("admin");
    const body = await request.json();
    const result = await mergeAdminListings(body, actor.id);
    return NextResponse.json({ merge: result });
  } catch (error) {
    return adminErrorResponse(error, "Listings could not be merged.");
  }
}

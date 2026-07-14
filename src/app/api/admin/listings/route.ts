import { NextResponse } from "next/server";

import {
  createAdminListing,
  getAdminActor,
  listAdminListings,
} from "@/modules/admin";

import { adminErrorResponse } from "../_errors";

export async function GET(request: Request) {
  try {
    await getAdminActor("moderator");
    const url = new URL(request.url);
    const listings = await listAdminListings(
      Object.fromEntries(url.searchParams.entries()),
    );
    return NextResponse.json({ listings });
  } catch (error) {
    return adminErrorResponse(error, "Admin listings could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAdminActor("moderator");
    const body = await request.json();
    const listing = await createAdminListing(body, actor.id);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error, "Listing could not be created.");
  }
}

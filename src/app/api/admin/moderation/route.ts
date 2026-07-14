import { NextResponse } from "next/server";

import { getAdminActor, listModerationItems } from "@/modules/admin";

import { adminErrorResponse } from "../_errors";

export async function GET(request: Request) {
  try {
    await getAdminActor("moderator");
    const url = new URL(request.url);
    const items = await listModerationItems(
      Object.fromEntries(url.searchParams.entries()),
    );
    return NextResponse.json({ items });
  } catch (error) {
    return adminErrorResponse(error, "Moderation queue could not be loaded.");
  }
}

import { NextResponse } from "next/server";

import { getAdminActor, getAdminMetrics } from "@/modules/admin";

import { adminErrorResponse } from "../_errors";

export async function GET() {
  try {
    await getAdminActor("moderator");
    return NextResponse.json({ metrics: await getAdminMetrics() });
  } catch (error) {
    return adminErrorResponse(error, "Admin metrics could not be loaded.");
  }
}

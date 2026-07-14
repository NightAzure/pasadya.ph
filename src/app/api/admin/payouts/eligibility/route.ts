import { NextResponse } from "next/server";

import { getAdminActor, getPayoutEligibilitySummary } from "@/modules/admin";

import { adminErrorResponse } from "../../_errors";

export async function GET() {
  try {
    await getAdminActor("admin");
    return NextResponse.json({
      eligibility: await getPayoutEligibilitySummary(),
    });
  } catch (error) {
    return adminErrorResponse(error, "Payout eligibility could not be loaded.");
  }
}

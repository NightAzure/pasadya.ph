import { NextResponse } from "next/server";

import { getAdminActor } from "@/modules/admin";
import { getPayoutDomain } from "@/app/api/payouts/_domain";

import { adminErrorResponse } from "../../_errors";

export async function GET() {
  try {
    const actor = await getAdminActor("admin");
    const domain = await getPayoutDomain();
    return NextResponse.json({
      reconciliation: await domain.getPayoutReconciliation(actor.id),
    });
  } catch (error) {
    return adminErrorResponse(
      error,
      "Payout reconciliation could not be loaded.",
    );
  }
}

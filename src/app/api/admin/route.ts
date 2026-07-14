import { NextResponse } from "next/server";

import { adminCapabilities, getAdminActor } from "@/modules/admin";

import { adminErrorResponse } from "./_errors";

export async function GET() {
  try {
    const actor = await getAdminActor("moderator");
    return NextResponse.json({
      authorized: true,
      actor: {
        id: actor.id,
        email: actor.email,
        name: actor.name,
        role: actor.role,
        isDevFallback: actor.isDevFallback,
      },
      capabilities: adminCapabilities(actor),
    });
  } catch (error) {
    return adminErrorResponse(
      error,
      "Admin authorization could not be checked.",
    );
  }
}

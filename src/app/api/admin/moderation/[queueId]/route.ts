import { NextResponse } from "next/server";

import { getAdminActor, resolveModerationItem } from "@/modules/admin";

import { adminErrorResponse, readJson } from "../../_errors";

type RouteContext = { params: Promise<{ queueId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  return resolve(request, params);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return resolve(request, params);
}

async function resolve(request: Request, params: Promise<{ queueId: string }>) {
  try {
    const actor = await getAdminActor("moderator");
    const { queueId } = await params;
    const result = await resolveModerationItem(
      queueId,
      await readJson(request),
      actor.id,
    );
    return NextResponse.json({ item: result });
  } catch (error) {
    return adminErrorResponse(error, "Moderation item could not be resolved.");
  }
}

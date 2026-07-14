import { NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/rbac";
import { getPortalActor } from "@/modules/portal/service";
import {
  getUnreadCount,
  listNotifications,
} from "@/modules/notifications/service";

export async function GET(request: Request) {
  try {
    const actor = await getPortalActor();
    const url = new URL(request.url);
    const notifications = await listNotifications({
      userId: actor.id,
      unreadOnly:
        url.searchParams.get("unreadOnly") ??
        url.searchParams.get("unread") ??
        undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    return NextResponse.json({
      notifications,
      unreadCount: await getUnreadCount(actor.id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Forbidden" ? 403 : 401 },
    );
  }
  if (error instanceof Error && error.name === "ZodError") {
    return NextResponse.json(
      { error: "Invalid notification query." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { error: "Unable to load notifications." },
    { status: 500 },
  );
}

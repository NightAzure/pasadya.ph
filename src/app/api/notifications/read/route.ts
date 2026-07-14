import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationError } from "@/lib/rbac";
import { getPortalActor } from "@/modules/portal/service";
import {
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
} from "@/modules/notifications/service";

const markReadRequestSchema = z.object({
  notificationId: z.string().uuid().optional(),
  notificationIds: z.array(z.string().uuid()).min(1).optional(),
  all: z
    .preprocess(
      (value) =>
        typeof value === "string"
          ? ["true", "1", "yes", "on"].includes(value.toLowerCase())
          : value,
      z.boolean(),
    )
    .optional()
    .default(false),
});

export async function POST(request: Request) {
  return markRead(request);
}

export async function PATCH(request: Request) {
  return markRead(request);
}

async function markRead(request: Request) {
  try {
    const actor = await getPortalActor();
    const input = await requestInput(request);
    const parsed = markReadRequestSchema.parse(input);
    const ids = [
      ...(parsed.notificationId ? [parsed.notificationId] : []),
      ...(parsed.notificationIds ?? []),
    ];
    if (!parsed.all && ids.length === 0) {
      return NextResponse.json(
        { error: "Provide notificationId, notificationIds, or all." },
        { status: 400 },
      );
    }

    const result = parsed.all
      ? await markAllNotificationsRead(actor.id)
      : await markNotificationsRead({
          userId: actor.id,
          notificationIds: [...new Set(ids)],
        });
    return NextResponse.json({
      ok: true,
      markedCount: result.markedCount,
      unreadCount: await getUnreadCount(actor.id),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Forbidden" ? 403 : 401 },
      );
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid mark-read request." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Unable to mark notifications as read." },
      { status: 500 },
    );
  }
}

async function requestInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }
  const formData = await request.formData();
  return {
    notificationId: String(formData.get("notificationId") ?? "") || undefined,
    notificationIds: String(formData.get("notificationIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    all: formData.get("all") ?? undefined,
  };
}

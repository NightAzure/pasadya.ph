import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationError } from "@/lib/rbac";
import {
  reportReviewPhoto,
  reviewPhotoReportSchema,
} from "@/modules/community/service";
import { getPortalActor } from "@/modules/portal/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const actor = await getPortalActor();
    const { mediaId } = await params;
    const parsed = reviewPhotoReportSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Photo report details are not valid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await reportReviewPhoto(mediaId, parsed.data, actor.id);
    return NextResponse.json(
      { ...result, message: "Thanks. The photo was sent for moderation." },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? error.message === "Unauthorized"
          ? 401
          : 403
        : error instanceof z.ZodError
          ? 400
          : error instanceof Error && error.message.includes("not found")
            ? 404
            : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Photo report could not be saved.",
      },
      { status },
    );
  }
}

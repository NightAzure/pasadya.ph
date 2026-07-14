import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/rbac";
import {
  createReviewPhoto,
  reviewPhotoInputSchema,
} from "@/modules/community/service";
import { getPortalActor } from "@/modules/portal/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const actor = await getPortalActor();
    const { reviewId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = reviewPhotoInputSchema.safeParse({
      ...(body && typeof body === "object" ? body : {}),
      reviewId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Review photo details are not valid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const photo = await createReviewPhoto(parsed.data, actor.id);
    return NextResponse.json(
      {
        photo,
        message: "Photo submitted for moderation.",
      },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? error.message === "Unauthorized"
          ? 401
          : 403
        : error instanceof ZodError
          ? 400
          : error instanceof Error &&
              (error.message.includes("already") ||
                error.message.includes("at most"))
            ? 409
            : error instanceof Error && error.message.includes("not found")
              ? 404
              : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Review photo could not be saved.",
      },
      { status },
    );
  }
}

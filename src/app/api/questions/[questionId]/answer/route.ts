import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/rbac";
import { getPortalActor } from "@/modules/portal/service";
import { answerInputSchema, answerQuestion } from "@/modules/community/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const actor = await getPortalActor();
    const { questionId } = await params;
    const parsed = answerInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Answer details are not valid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    return NextResponse.json({
      question: await answerQuestion(questionId, parsed.data, actor.id),
    });
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? 403
        : error instanceof ZodError
          ? 400
          : error instanceof Error && error.message.includes("not found")
            ? 404
            : error instanceof Error && error.message.includes("already")
              ? 409
              : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Answer could not be saved.",
      },
      { status },
    );
  }
}

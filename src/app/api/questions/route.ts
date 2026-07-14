import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { AuthorizationError } from "@/lib/rbac";
import {
  createQuestion,
  listQuestions,
  questionInputSchema,
} from "@/modules/community/service";

export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get("listingId");
  const parsed = questionInputSchema.shape.listingId.safeParse(listingId);
  if (!parsed.success)
    return NextResponse.json(
      { error: "listingId is required." },
      { status: 400 },
    );
  try {
    return NextResponse.json({ questions: await listQuestions(parsed.data) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Questions could not be loaded.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getPortalActor();
    const parsed = questionInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Question details are not valid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    return NextResponse.json(
      { question: await createQuestion(parsed.data, actor.id) },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? 403
        : error instanceof ZodError
          ? 400
          : error instanceof Error && error.message.includes("not found")
            ? 404
            : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Question could not be created.",
      },
      { status },
    );
  }
}

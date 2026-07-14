import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { AuthorizationError } from "@/lib/rbac";
import {
  createCrowdReport,
  crowdReportInputSchema,
  getCrowdDisplay,
  crowdLevels,
} from "@/modules/community/service";
import { uuidSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const listingId = uuidSchema.safeParse(params.get("listingId"));
  if (!listingId.success)
    return NextResponse.json(
      { error: "listingId is required." },
      { status: 400 },
    );
  const heuristicLevel = params.get("heuristicLevel");
  const heuristicSource = params.get("heuristicSource") ?? undefined;
  if (
    heuristicLevel &&
    !crowdLevels.includes(heuristicLevel as (typeof crowdLevels)[number])
  ) {
    return NextResponse.json(
      { error: "heuristicLevel is not valid." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({
      crowd: await getCrowdDisplay(
        listingId.data,
        heuristicLevel
          ? {
              level: heuristicLevel as (typeof crowdLevels)[number],
              source: heuristicSource,
            }
          : undefined,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Crowd signal could not be loaded.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getPortalActor();
    const parsed = crowdReportInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Crowd report details are not valid.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    return NextResponse.json(
      { crowd: await createCrowdReport(parsed.data, actor.id) },
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
            : error instanceof Error && error.message.includes("limit")
              ? 409
              : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Crowd report could not be created.",
      },
      { status },
    );
  }
}

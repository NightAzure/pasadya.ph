import { NextResponse } from "next/server";
import { z } from "zod";

import { authorize } from "@/lib/rbac";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createRouteContribution } from "@/modules/transport/service";

const coordinateSchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});

const contributionSchema = z.object({
  type: z.enum(["new_route", "correction", "new_stop", "fare_update"]),
  routeName: z.string().trim().min(3).max(120),
  mode: z.enum([
    "jeepney",
    "bus",
    "ferry",
    "tricycle",
    "multicab",
    "habal_habal",
  ]),
  from: z.string().trim().min(2).max(120),
  to: z.string().trim().min(2).max(120),
  fare: z.coerce.number().int().min(0).max(100_000),
  notes: z.string().trim().max(1000).optional().default(""),
  origin: coordinateSchema.optional(),
  destination: coordinateSchema.optional(),
});

export async function POST(request: Request) {
  const session = await authorize();
  const limit = checkRateLimit({
    key: `transport:contribution:${session.user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Contribution rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const body = contributionSchema.parse(await request.json());
  const id = await createRouteContribution({
    userId: session.user.id,
    type: body.type,
    data: body,
  });

  return NextResponse.json(
    {
      ok: true,
      contributionId: id,
      message: "Thanks. A moderator will review this route.",
    },
    { status: 201, headers: rateLimitHeaders(limit) },
  );
}

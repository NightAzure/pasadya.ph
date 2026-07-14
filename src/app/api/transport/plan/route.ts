import { NextResponse } from "next/server";
import { z } from "zod";

import { planJourney } from "@/modules/transport/service";

const pointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

const planSchema = z.object({
  origin: pointSchema,
  originLabel: z.string().trim().min(1).max(120),
  destination: pointSchema,
  destinationLabel: z.string().trim().min(1).max(160),
});

export async function POST(request: Request) {
  const body = planSchema.parse(await request.json());
  const journey = await planJourney(body);

  return NextResponse.json({
    journey,
    message: journey
      ? undefined
      : "No seeded route covers that origin and destination yet.",
  });
}

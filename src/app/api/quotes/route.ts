import { NextResponse } from "next/server";

import {
  getAuthoritativeQuote,
  quoteRequestSchema,
} from "@/modules/pricing/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Check the dates, guests, units, and visit duration.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  return NextResponse.json(await getAuthoritativeQuote(parsed.data));
}

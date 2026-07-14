import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  claimUploadSchema,
  createDevSignedUpload,
  photoUploadSchema,
} from "@/modules/portal/upload";
import { getPortalActor } from "@/modules/portal/service";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const signUploadSchema = z.object({
  scope: z.enum(["claim", "listing-photo", "review-photo"]),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.coerce.number(),
});

export async function POST(request: NextRequest) {
  const actor = await getPortalActor();
  const limit = checkRateLimit({
    key: `uploads:sign:${actor.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Upload signing rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const body = signUploadSchema.parse(await request.json());
  const metadata =
    body.scope === "claim"
      ? claimUploadSchema.parse(body)
      : photoUploadSchema.parse(body);

  return NextResponse.json(
    {
      ok: true,
      upload: createDevSignedUpload(metadata, body.scope),
    },
    { headers: rateLimitHeaders(limit) },
  );
}

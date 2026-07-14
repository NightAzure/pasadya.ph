import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { processUploadedObject } from "@/modules/storage";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const processSchema = z.object({
  storageKey: z.string().trim().min(3).max(400),
  contentType: z.string().trim().min(3).max(120),
});

export async function POST(request: NextRequest) {
  const actor = await getPortalActor();
  const limit = checkRateLimit({
    key: `uploads:process:${actor.id}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Upload processing rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const body = processSchema.parse(await request.json());
  let bytes: Uint8Array | undefined;
  const contentTypeHeader = request.headers.get("x-upload-bytes-base64");
  if (contentTypeHeader) {
    bytes = Buffer.from(contentTypeHeader, "base64");
  } else if (
    request.headers.get("content-type")?.includes("multipart/form-data")
  ) {
    // Reserved for future form uploads.
  }

  try {
    const processed = await processUploadedObject({
      storageKey: body.storageKey,
      contentType: body.contentType,
      bytes,
    });
    return NextResponse.json(
      { ok: true, upload: processed },
      { headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload could not be processed.",
      },
      { status: 400, headers: rateLimitHeaders(limit) },
    );
  }
}

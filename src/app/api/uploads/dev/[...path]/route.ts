import { NextResponse, type NextRequest } from "next/server";

import { getDevObject, putDevObject } from "@/modules/storage";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit({
    key: `uploads:dev-put:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Upload rate limit exceeded. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const { path = [] } = await context.params;
  const storageKey = path.map(decodeURIComponent).join("/");
  if (!storageKey || storageKey.includes("..")) {
    return NextResponse.json(
      { error: "Invalid storage key." },
      { status: 400 },
    );
  }

  const contentType =
    request.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty upload body." }, { status: 400 });
  }
  if (bytes.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Upload exceeds the 10MB limit." },
      { status: 413 },
    );
  }

  try {
    const processed = putDevObject(storageKey, bytes, contentType);
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
            : "Upload could not be stored.",
      },
      { status: 400, headers: rateLimitHeaders(limit) },
    );
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const storageKey = path.map(decodeURIComponent).join("/");
  const object = getDevObject(storageKey);
  if (!object) {
    return NextResponse.json({ error: "Object not found." }, { status: 404 });
  }
  if (storageKey.startsWith("claim/")) {
    return NextResponse.json(
      { error: "Claim documents are private." },
      { status: 403 },
    );
  }

  return new NextResponse(Buffer.from(object.bytes), {
    headers: {
      "content-type": object.contentType,
      "cache-control": "private, max-age=60",
    },
  });
}

import { NextResponse } from "next/server";

import {
  handlePaymentWebhook,
  verifyPaymongoSignature,
} from "@/modules/payments";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit({
    key: `webhook:paymongo:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Webhook rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature") ?? "";
  if (!verifyPaymongoSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401, headers: rateLimitHeaders(limit) },
    );
  }

  try {
    const result = await handlePaymentWebhook(rawBody, signature);
    return NextResponse.json(result, { headers: rateLimitHeaders(limit) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook could not be processed.",
      },
      { status: 400, headers: rateLimitHeaders(limit) },
    );
  }
}

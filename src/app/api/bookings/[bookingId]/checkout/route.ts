import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createCheckoutSession } from "@/modules/payments";
import { getPortalActor } from "@/modules/portal/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const actor = await getPortalActor();
  const limit = checkRateLimit({
    key: `checkout:${actor.id}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Checkout rate limit exceeded." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const { bookingId } = await params;
  if (!z.string().uuid().safeParse(bookingId).success) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  try {
    const checkout = await createCheckoutSession({
      bookingId,
      actorId: actor.id,
    });
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (acceptsHtml) return Response.redirect(checkout.checkoutUrl, 303);
    return NextResponse.json(checkout, { headers: rateLimitHeaders(limit) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout could not be started.",
      },
      { status: 400, headers: rateLimitHeaders(limit) },
    );
  }
}

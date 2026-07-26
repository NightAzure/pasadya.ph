import { NextResponse } from "next/server";
import { z } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { QuoteRejectedError } from "@/modules/pricing/service";
import { domainUnavailable, getBookingDomain } from "./_domain";

const createBookingSchema = z.object({
  listingId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  pax: z.coerce.number().int().min(1).max(100),
  ratePlanId: z.string().uuid(),
  requestedUnits: z.coerce.number().int().min(1).max(100).optional(),
  durationHours: z.coerce.number().int().min(1).max(24).optional(),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().min(8).max(24),
  guestEmail: z.string().trim().email().max(180),
  specialRequests: z.string().trim().max(700).optional(),
});

export async function GET() {
  const actor = await getPortalActor();
  const domain = await getBookingDomain();
  if (!domain?.listBookingsForActor) {
    return NextResponse.json(domainUnavailable(), { status: 503 });
  }

  return NextResponse.json({
    bookings: await domain.listBookingsForActor(actor.id),
  });
}

export async function POST(request: Request) {
  const actor = await getPortalActor();
  const formData = await request.formData();
  const parsed = createBookingSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check the highlighted booking details and try again.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsed.data.checkOut < parsed.data.checkIn) {
    return NextResponse.json(
      { error: "Check-out must be on or after check-in." },
      { status: 400 },
    );
  }

  const domain = await getBookingDomain();
  if (!domain?.createBooking) {
    return NextResponse.json(domainUnavailable(), { status: 503 });
  }

  let result;
  try {
    result = await domain.createBooking(parsed.data, actor.id);
  } catch (error) {
    if (error instanceof QuoteRejectedError) {
      return NextResponse.json(
        {
          error: "This booking request cannot be quoted exactly.",
          rejections: error.rejections,
        },
        { status: 409 },
      );
    }
    throw error;
  }
  if (result.checkoutUrl) {
    return Response.redirect(result.checkoutUrl, 303);
  }
  return Response.redirect(
    new URL("/account/bookings?created=1", request.url),
    303,
  );
}

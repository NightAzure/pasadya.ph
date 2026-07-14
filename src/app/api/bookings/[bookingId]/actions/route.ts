import { NextResponse } from "next/server";
import { z } from "zod";

import { createCheckoutSession } from "@/modules/payments";
import { getPortalActor } from "@/modules/portal/service";
import { domainUnavailable, getBookingDomain } from "../../_domain";

const actionSchema = z.object({
  action: z.enum(["accept", "decline"]),
  reason: z.string().trim().max(700).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const actor = await getPortalActor();
  const { bookingId } = await params;
  const formData = await request.formData();
  const parsed = actionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success || !z.string().uuid().safeParse(bookingId).success) {
    return NextResponse.json(
      { error: "This booking action is not valid." },
      { status: 400 },
    );
  }

  const domain = await getBookingDomain();
  if (!domain?.acceptBooking || !domain.declineBooking) {
    return NextResponse.json(domainUnavailable(), { status: 503 });
  }

  if (parsed.data.action === "decline") {
    const booking = await domain.declineBooking(
      bookingId,
      actor.id,
      parsed.data.reason,
    );
    return NextResponse.redirect(
      new URL(`/portal/bookings/${booking.id}?updated=1`, request.url),
      303,
    );
  }

  await domain.acceptBooking(bookingId, actor.id);
  // Acceptance already authorizes the owner. Checkout authorization belongs to
  // the guest on the booking, so do not pass the owner as the checkout actor.
  await createCheckoutSession({ bookingId });
  return NextResponse.redirect(
    new URL(`/portal/bookings/${bookingId}?updated=1`, request.url),
    303,
  );
}

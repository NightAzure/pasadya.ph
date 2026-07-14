import { NextResponse } from "next/server";
import { z } from "zod";

import { getPortalActor } from "@/modules/portal/service";
import { domainUnavailable, getBookingDomain } from "../_domain";

const idSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const actor = await getPortalActor();
  const { bookingId } = await params;
  const parsedId = idSchema.safeParse(bookingId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const domain = await getBookingDomain();
  if (!domain?.getBookingForActor) {
    return NextResponse.json(domainUnavailable(), { status: 503 });
  }

  const booking = await domain.getBookingForActor(parsedId.data, actor.id);
  return booking
    ? NextResponse.json({ booking })
    : NextResponse.json({ error: "Booking not found." }, { status: 404 });
}

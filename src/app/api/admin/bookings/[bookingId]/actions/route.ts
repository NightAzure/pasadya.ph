import { NextResponse } from "next/server";
import { z } from "zod";

import { adminManageBooking, getAdminActor } from "@/modules/admin";

import { adminErrorResponse } from "../../../_errors";

const bookingIdSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const actor = await getAdminActor("admin");
    const { bookingId } = await params;
    if (!bookingIdSchema.safeParse(bookingId).success) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }
    const body = await request.json();
    const result = await adminManageBooking(bookingId, body, actor.id);
    return NextResponse.json({ booking: result });
  } catch (error) {
    return adminErrorResponse(error, "Booking action could not be completed.");
  }
}

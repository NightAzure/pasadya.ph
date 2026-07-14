import { NextResponse } from "next/server";

import { getAdminActor, listBookingOversight } from "@/modules/admin";

import { adminErrorResponse } from "../_errors";

export async function GET(request: Request) {
  try {
    await getAdminActor("moderator");
    const url = new URL(request.url);
    const bookings = await listBookingOversight(
      Object.fromEntries(url.searchParams.entries()),
    );
    return NextResponse.json({ bookings });
  } catch (error) {
    return adminErrorResponse(error, "Booking oversight could not be loaded.");
  }
}

import { NextResponse } from "next/server";

import {
  defaultOrigins,
  getFerrySchedules,
  getPublishedRoutes,
  getTransportDestinations,
} from "@/modules/transport/service";

export async function GET() {
  const [routes, ferries, destinations] = await Promise.all([
    getPublishedRoutes(),
    getFerrySchedules(),
    getTransportDestinations(),
  ]);

  return NextResponse.json({
    origins: defaultOrigins,
    destinations,
    routes,
    ferries,
  });
}

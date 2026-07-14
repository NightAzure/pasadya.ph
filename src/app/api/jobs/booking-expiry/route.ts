import { NextResponse } from "next/server";

import { authorizeJobRequest, runScheduledJob } from "@/modules/jobs";

export async function POST(request: Request) {
  const authorization = authorizeJobRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      {
        error:
          authorization.status === 503
            ? "Booking expiry job is not configured."
            : authorization.error,
      },
      { status: authorization.status },
    );
  }

  try {
    const job = await runScheduledJob({
      type: "booking-expiry",
      cadence: "hour",
    });
    if (job.status === "failed") {
      return NextResponse.json(
        { error: job.error ?? "Booking expiry job failed.", job },
        { status: 500 },
      );
    }
    const result = job.status === "completed" ? job.result : {};
    const responseStatus = String(job.status) === "running" ? 202 : 200;
    return NextResponse.json(
      {
        expired: Array.isArray(result?.expiredBookingIds)
          ? result.expiredBookingIds
          : [],
        job,
      },
      { status: responseStatus },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Booking expiry job failed.",
      },
      { status: 500 },
    );
  }
}

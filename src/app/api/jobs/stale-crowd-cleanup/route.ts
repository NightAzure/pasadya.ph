import { NextResponse } from "next/server";

import { authorizeJobRequest, runScheduledJob } from "@/modules/jobs";

export async function POST(request: Request) {
  const authorization = authorizeJobRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  try {
    const job = await runScheduledJob({
      type: "stale-crowd-cleanup",
      cadence: "hour",
    });
    const responseStatus = String(job.status) === "running" ? 202 : 200;
    return NextResponse.json(
      { job },
      { status: job.status === "failed" ? 500 : responseStatus },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stale crowd cleanup failed.",
      },
      { status: 500 },
    );
  }
}

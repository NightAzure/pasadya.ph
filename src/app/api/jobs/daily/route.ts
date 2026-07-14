import { NextResponse } from "next/server";

import { authorizeJobRequest, runDailyJobs } from "@/modules/jobs";

export async function POST(request: Request) {
  const authorization = authorizeJobRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  try {
    const result = await runDailyJobs();
    const hasFailure = result.executions.some(
      (execution) => execution.status === "failed",
    );
    const hasRunning = result.scheduled.some(
      (job) => job.status === "pending" || job.status === "running",
    );
    return NextResponse.json(result, {
      status: hasFailure ? 500 : hasRunning ? 202 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Daily jobs failed.",
      },
      { status: 500 },
    );
  }
}

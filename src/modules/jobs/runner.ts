import { sql } from "drizzle-orm";

import { db } from "@/db/client";

import { jobHandlers } from "./handlers";
import type {
  ClaimedJob,
  JobHandler,
  JobPayload,
  JobStatus,
  JobType,
} from "./types";

const DEFAULT_LEASE_MS = 5 * 60_000;
const MAX_ERROR_LENGTH = 2_000;

type JobRow = {
  id: string;
  type: string;
  payload: unknown;
  status: JobStatus;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
};

export type JobExecution = {
  id: string;
  type: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
};

export type EnqueuedJob = {
  id: string;
  type: string;
  status: JobStatus;
  payload: JobPayload;
  created: boolean;
};

function asPayload(value: unknown): JobPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as JobPayload;
}

function jsonParameter(value: unknown) {
  return JSON.stringify(value ?? null);
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(
    0,
    MAX_ERROR_LENGTH,
  );
}

export async function enqueueJob(input: {
  type: JobType;
  payload?: JobPayload;
  scheduledAt?: Date;
  idempotencyKey?: string;
}): Promise<EnqueuedJob> {
  const scheduledAt = input.scheduledAt ?? new Date();
  const payload = { ...(input.payload ?? {}) };
  if (input.idempotencyKey) payload._jobKey = input.idempotencyKey;

  return db.transaction(async (tx) => {
    if (input.idempotencyKey) {
      // The schema predates a dedicated idempotency-key column. This lock
      // makes the JSON payload key unique for concurrent enqueuers while
      // remaining compatible with the existing jobs table.
      await tx.execute(sql`
        select pg_advisory_xact_lock(
          hashtext(${`job-enqueue:${input.type}:${input.idempotencyKey}`})
        )
      `);

      const existing = await tx.execute<JobRow>(sql`
        select
          id::text,
          type,
          payload,
          status,
          scheduled_at as "scheduledAt",
          started_at as "startedAt",
          completed_at as "completedAt",
          error
        from jobs
        where type = ${input.type}
          and payload ->> '_jobKey' = ${input.idempotencyKey}
        order by scheduled_at desc
        limit 1
        for update
      `);
      const row = existing.rows[0];
      if (row) {
        if (row.status === "failed") {
          const retried = await tx.execute<JobRow>(sql`
            update jobs
            set payload = ${jsonParameter(payload)}::jsonb,
                status = 'pending'::job_status,
                scheduled_at = ${scheduledAt},
                started_at = null,
                completed_at = null,
                error = null
            where id = ${row.id}::uuid
            returning
              id::text,
              type,
              payload,
              status,
              scheduled_at as "scheduledAt",
              started_at as "startedAt",
              completed_at as "completedAt",
              error
          `);
          const retriedRow = retried.rows[0];
          if (!retriedRow) throw new Error("Failed job could not be retried.");
          return toEnqueuedJob(retriedRow, false);
        }
        return toEnqueuedJob(row, false);
      }
    }

    const inserted = await tx.execute<JobRow>(sql`
      insert into jobs (type, payload, scheduled_at)
      values (${input.type}, ${jsonParameter(payload)}::jsonb, ${scheduledAt})
      returning
        id::text,
        type,
        payload,
        status,
        scheduled_at as "scheduledAt",
        started_at as "startedAt",
        completed_at as "completedAt",
        error
    `);
    const row = inserted.rows[0];
    if (!row) throw new Error("Job could not be enqueued.");
    return toEnqueuedJob(row, true);
  });
}

function toEnqueuedJob(row: JobRow, created: boolean): EnqueuedJob {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    payload: asPayload(row.payload),
    created,
  };
}

export async function claimNextJob(options?: {
  types?: readonly JobType[];
  leaseMs?: number;
}): Promise<ClaimedJob | null> {
  const leaseMs = options?.leaseMs ?? DEFAULT_LEASE_MS;
  if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
    throw new Error("Job lease must be a positive number.");
  }
  const types = options?.types ?? [];
  const typeFilter = types.length
    ? sql`and type in (${sql.join(
        types.map((type) => sql`${type}`),
        sql`, `,
      )})`
    : sql``;
  const claimedAt = new Date();
  const result = await db.execute<ClaimedJob>(sql`
    with candidate as (
      select id
      from jobs
      where (
        (status = 'pending'::job_status and scheduled_at <= now())
        or (
          status = 'running'::job_status
          and started_at is not null
          and started_at <= now() - make_interval(secs => ${leaseMs / 1000})
        )
      )
      ${typeFilter}
      order by scheduled_at asc, id asc
      for update skip locked
      limit 1
    )
    update jobs j
    set status = 'running'::job_status,
        started_at = ${claimedAt},
        completed_at = null,
        error = null
    from candidate
    where j.id = candidate.id
    returning
      j.id::text,
      j.type,
      j.payload,
      j.scheduled_at as "scheduledAt",
      j.started_at as "startedAt"
  `);
  const job = result.rows[0];
  return job ? { ...job, payload: asPayload(job.payload) } : null;
}

export async function completeJob(
  job: ClaimedJob,
  result: Record<string, unknown> = {},
) {
  const payload = { ...job.payload, _result: result };
  const completed = await db.execute<{ id: string }>(sql`
    update jobs
    set status = 'completed'::job_status,
        completed_at = now(),
        error = null,
        payload = ${jsonParameter(payload)}::jsonb
    where id = ${job.id}::uuid
      and status = 'running'::job_status
      and started_at = ${job.startedAt}
    returning id::text
  `);
  if (!completed.rows[0])
    throw new Error("Job claim was lost before completion.");
}

export async function failJob(job: ClaimedJob, error: unknown) {
  const failed = await db.execute<{ id: string }>(sql`
    update jobs
    set status = 'failed'::job_status,
        completed_at = null,
        error = ${errorMessage(error)}
    where id = ${job.id}::uuid
      and status = 'running'::job_status
      and started_at = ${job.startedAt}
    returning id::text
  `);
  if (!failed.rows[0])
    throw new Error("Job claim was lost before failure was recorded.");
}

export async function runDueJobs(options?: {
  types?: readonly JobType[];
  limit?: number;
  leaseMs?: number;
}): Promise<JobExecution[]> {
  const limit = options?.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Job run limit must be an integer from 1 to 100.");
  }

  const executions: JobExecution[] = [];
  while (executions.length < limit) {
    const job = await claimNextJob(options);
    if (!job) break;

    const handler = jobHandlers[job.type as JobType] as JobHandler | undefined;
    if (!handler) {
      const unknownTypeError = new Error(
        `No handler registered for job type '${job.type}'.`,
      );
      try {
        await failJob(job, unknownTypeError);
      } catch (error) {
        executions.push({
          id: job.id,
          type: job.type,
          status: "failed",
          error: errorMessage(error),
        });
        continue;
      }
      executions.push({
        id: job.id,
        type: job.type,
        status: "failed",
        error: unknownTypeError.message,
      });
      continue;
    }

    try {
      const result = await handler(job.payload);
      await completeJob(job, result);
      executions.push({
        id: job.id,
        type: job.type,
        status: "completed",
        result,
      });
    } catch (error) {
      const message = errorMessage(error);
      try {
        await failJob(job, error);
      } catch {
        // The original worker may have lost its lease. Returning the original
        // handler failure is still more useful to the caller.
      }
      executions.push({
        id: job.id,
        type: job.type,
        status: "failed",
        error: message,
      });
    }
  }
  return executions;
}

function utcBucket(at: Date, cadence: "hour" | "day") {
  const date = at.toISOString();
  return cadence === "day" ? date.slice(0, 10) : date.slice(0, 13);
}

export async function runScheduledJob(input: {
  type: JobType;
  cadence: "hour" | "day";
}) {
  const now = new Date();
  const idempotencyKey = `${input.type}:${utcBucket(now, input.cadence)}`;
  const enqueued = await enqueueJob({
    type: input.type,
    scheduledAt: now,
    idempotencyKey,
    payload: {
      schedule: input.cadence,
      scheduledFor: now.toISOString(),
    },
  });

  if (enqueued.status === "completed") {
    return {
      id: enqueued.id,
      type: enqueued.type,
      status: "completed" as const,
      result: asPayload(enqueued.payload._result),
      deduplicated: true,
    };
  }
  if (enqueued.status === "running") {
    const executions = await runDueJobs({ types: [input.type], limit: 1 });
    return (
      executions[0] ?? {
        id: enqueued.id,
        type: enqueued.type,
        status: "running" as const,
        deduplicated: true,
      }
    );
  }

  const executions = await runDueJobs({ types: [input.type], limit: 1 });
  return (
    executions[0] ?? {
      id: enqueued.id,
      type: enqueued.type,
      status: "running" as const,
      deduplicated: true,
    }
  );
}

export async function runDailyJobs() {
  const now = new Date();
  const scheduled = await Promise.all([
    enqueueJob({
      type: "booking-expiry",
      idempotencyKey: `booking-expiry:${utcBucket(now, "hour")}`,
    }),
    enqueueJob({
      type: "stale-crowd-cleanup",
      idempotencyKey: `stale-crowd-cleanup:${utcBucket(now, "hour")}`,
    }),
    enqueueJob({
      type: "notification-digest",
      idempotencyKey: `notification-digest:${utcBucket(now, "day")}`,
    }),
    enqueueJob({
      type: "payment-reconciliation",
      idempotencyKey: `payment-reconciliation:${utcBucket(now, "day")}`,
    }),
    enqueueJob({
      type: "payout-preparation",
      idempotencyKey: `payout-preparation:${utcBucket(now, "day")}`,
    }),
    enqueueJob({
      type: "search-refresh",
      idempotencyKey: `search-refresh:${utcBucket(now, "day")}`,
    }),
  ]);
  const executions = await runDueJobs({ limit: scheduled.length });
  const executionById = new Map(
    executions.map((execution) => [execution.id, execution]),
  );
  const scheduledWithCurrentStatus = scheduled.map((job) => ({
    id: job.id,
    type: job.type,
    status: executionById.get(job.id)?.status ?? job.status,
    created: job.created,
  }));
  return {
    scheduled: scheduledWithCurrentStatus,
    executions,
  };
}

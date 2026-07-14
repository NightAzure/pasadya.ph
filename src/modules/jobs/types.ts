export const jobTypes = [
  "booking-expiry",
  "stale-crowd-cleanup",
  "notification-digest",
  "payment-reconciliation",
  "payout-preparation",
  "search-refresh",
] as const;

export type JobType = (typeof jobTypes)[number];
export type JobPayload = Record<string, unknown>;

export type JobStatus = "pending" | "running" | "completed" | "failed";

export type ClaimedJob = {
  id: string;
  type: string;
  payload: JobPayload;
  scheduledAt: Date;
  startedAt: Date;
};

export type JobHandler = (
  payload: JobPayload,
) => Promise<Record<string, unknown>>;

import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import {
  authorizeJobRequest,
  claimNextJob,
  completeJob,
  enqueueJob,
  handleNotificationDigest,
  handlePaymentReconciliation,
  handlePayoutPreparation,
  handleSearchRefresh,
} from "@/modules/jobs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const key = `phase08-verifier:${Date.now()}`;
  const cleanup = () =>
    db.execute(sql`
      delete from jobs where payload ->> '_jobKey' = ${key}
    `);

  try {
    process.env.JOB_SECRET = "phase08-test-secret";
    assert(
      authorizeJobRequest(
        new Request("http://localhost/api/jobs/daily", {
          headers: { authorization: "Bearer phase08-test-secret" },
        }),
      ).authorized,
      "JOB_SECRET authorization should accept the configured bearer token.",
    );
    assert(
      !authorizeJobRequest(
        new Request("http://localhost/api/jobs/daily", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
      ).authorized,
      "JOB_SECRET authorization should reject an incorrect bearer token.",
    );

    const [first, second] = await Promise.all([
      enqueueJob({ type: "notification-digest", idempotencyKey: key }),
      enqueueJob({ type: "notification-digest", idempotencyKey: key }),
    ]);
    assert(
      first.id === second.id,
      "Concurrent enqueue should deduplicate jobs.",
    );

    const claimed = await claimNextJob({ types: ["notification-digest"] });
    assert(
      claimed?.id === first.id,
      "The deduplicated job should be claimable.",
    );
    const result = await handleNotificationDigest(claimed.payload);
    await completeJob(claimed, result);

    const completed = await enqueueJob({
      type: "notification-digest",
      idempotencyKey: key,
    });
    assert(
      completed.id === first.id && completed.status === "completed",
      "Completed jobs should remain idempotent on re-enqueue.",
    );

    const reconciliation = await handlePaymentReconciliation({});
    assert(
      typeof reconciliation.totalRows === "number" &&
        typeof reconciliation.exceptionCount === "number",
      "Payment reconciliation should return an operational summary.",
    );
    const provider = reconciliation.provider as
      { checkedCount?: number } | null | undefined;
    assert(
      provider && typeof provider.checkedCount === "number",
      "Payment reconciliation should include provider check summary.",
    );

    const payoutPreparation = await handlePayoutPreparation({});
    assert(
      typeof payoutPreparation.batchCount === "number" &&
        Array.isArray(payoutPreparation.batches),
      "Payout preparation should return reviewable batches.",
    );

    const searchRefresh = await handleSearchRefresh({});
    assert(
      typeof searchRefresh.refreshedCount === "number",
      "Search refresh should report the number of listings updated.",
    );

    console.log("Phase 08 jobs verification passed");
  } finally {
    await cleanup();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

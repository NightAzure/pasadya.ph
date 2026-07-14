import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { adminListingEditChangesSchema } from "@/modules/admin/schemas";

const listingIdSchema = z.string().uuid();

export const listingReportInputSchema = z.object({
  listingId: listingIdSchema,
  reason: z.string().trim().min(3).max(500),
});

export const listingEditRequestSchema = z.object({
  listingId: listingIdSchema,
  changes: adminListingEditChangesSchema,
  note: z.string().trim().max(500).optional(),
});

export async function submitListingReport(input: unknown, actorId: string) {
  const parsed = listingReportInputSchema.parse(input);
  const parsedActorId = listingIdSchema.parse(actorId);

  return db.transaction(async (tx) => {
    await assertPublicListing(tx, parsed.listingId);
    await assertNoPendingRequest(tx, "listing_report", parsed.listingId);

    const inserted = await tx.execute<{ id: string }>(sql`
      insert into moderation_queue (type, reference_id, reason, payload)
      values (
        'listing_report'::moderation_type,
        ${parsed.listingId}::uuid,
        ${parsed.reason},
        ${JSON.stringify({
          reporterId: parsedActorId,
          reportReason: parsed.reason,
        })}::jsonb
      )
      returning id::text
    `);
    const queueId = inserted.rows[0]?.id;
    if (!queueId) throw new Error("Listing report could not be created.");

    await writeSubmissionAudit(tx, {
      actorId: parsedActorId,
      action: "listing.report.submit",
      listingId: parsed.listingId,
      queueId,
      changes: { reason: parsed.reason },
    });

    return { queueId, listingId: parsed.listingId, status: "pending" } as const;
  });
}

export async function submitListingEdit(input: unknown, actorId: string) {
  const parsed = listingEditRequestSchema.parse(input);
  const parsedActorId = listingIdSchema.parse(actorId);

  return db.transaction(async (tx) => {
    await assertPublicListing(tx, parsed.listingId);
    await assertNoPendingRequest(tx, "listing_edit", parsed.listingId);

    const inserted = await tx.execute<{ id: string }>(sql`
      insert into moderation_queue (type, reference_id, reason, payload)
      values (
        'listing_edit'::moderation_type,
        ${parsed.listingId}::uuid,
        ${parsed.note || "Suggested listing correction"},
        ${JSON.stringify({
          reporterId: parsedActorId,
          changes: parsed.changes,
          note: parsed.note || null,
        })}::jsonb
      )
      returning id::text
    `);
    const queueId = inserted.rows[0]?.id;
    if (!queueId) throw new Error("Listing edit request could not be created.");

    await writeSubmissionAudit(tx, {
      actorId: parsedActorId,
      action: "listing.edit.submit",
      listingId: parsed.listingId,
      queueId,
      changes: parsed.changes,
    });

    return { queueId, listingId: parsed.listingId, status: "pending" } as const;
  });
}

async function assertPublicListing(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  listingId: string,
) {
  const result = await tx.execute(sql`
    select 1
    from listings
    where id = ${listingId}::uuid
      and status <> 'archived'::listing_status
    limit 1
  `);
  if (!result.rows[0]) throw new Error("Listing not found.");
}

async function assertNoPendingRequest(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  type: "listing_report" | "listing_edit",
  listingId: string,
) {
  const result = await tx.execute(sql`
    select 1
    from moderation_queue
    where type = ${type}::moderation_type
      and reference_id = ${listingId}::uuid
      and status = 'pending'::moderation_status
    limit 1
  `);
  if (result.rows[0]) {
    throw new Error("A similar listing request is already under review.");
  }
}

async function writeSubmissionAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    actorId: string;
    action: string;
    listingId: string;
    queueId: string;
    changes: unknown;
  },
) {
  await tx.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${input.actorId}::uuid,
      ${input.action},
      'listing',
      ${input.listingId}::uuid,
      ${JSON.stringify({ queueId: input.queueId, ...asRecord(input.changes) })}::jsonb
    )
  `);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

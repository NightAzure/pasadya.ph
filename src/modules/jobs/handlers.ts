import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  expireUnpaidBookings,
  reconcilePaymentRecords,
} from "@/modules/payments";
import {
  rebuildListingStopAccess,
  rebuildRouteEdges,
} from "@/modules/transport/graph";

import type { JobHandler } from "./types";

export const handleBookingExpiry: JobHandler = async () => {
  // Keep the existing transition and notification behavior in one domain
  // function. It only emits an expiry notification after a successful state
  // transition, so a repeated job run is a no-op for already expired rows.
  const expiredBookingIds = await expireUnpaidBookings();
  return {
    expiredCount: expiredBookingIds.length,
    expiredBookingIds,
  };
};

export const handleStaleCrowdCleanup: JobHandler = async () => {
  return db.transaction(async (tx) => {
    const deleted = await tx.execute<{ id: string }>(sql`
      delete from crowd_reports
      where expires_at is not null and expires_at <= now()
      returning id::text
    `);

    // Business reports also copy their display values into listing attributes.
    // Clear only values that no longer have an active business report; a newer
    // report remains authoritative.
    const cleared = await tx.execute<{ id: string }>(sql`
      update listings l
      set attributes = l.attributes - 'crowd_level' - 'crowd_source',
          updated_at = now()
      where l.attributes ->> 'crowd_source' ilike '%business%'
        and not exists (
          select 1
          from crowd_reports cr
          where cr.listing_id = l.id
            and cr.source = 'business'::crowd_source
            and cr.expires_at > now()
        )
      returning l.id::text
    `);

    return {
      deletedReportCount: deleted.rows.length,
      clearedListingCount: cleared.rows.length,
    };
  });
};

type DigestNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: Date;
};

export const handleNotificationDigest: JobHandler = async () => {
  const now = new Date();
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const result = await db.execute<DigestNotification & { userId: string }>(sql`
    select
      n.id::text as id,
      n.user_id::text as "userId",
      n.type,
      n.title,
      n.body,
      n.created_at as "createdAt"
    from notifications n
    where n.channel = 'in_app'::notification_channel
      and n.read = false
      and n.created_at >= ${windowStart}
    order by n.created_at desc
    limit 5000
  `);

  const byUser = new Map<
    string,
    { notificationCount: number; items: DigestNotification[] }
  >();
  for (const row of result.rows) {
    const digest = byUser.get(row.userId) ?? {
      notificationCount: 0,
      items: [],
    };
    digest.notificationCount += 1;
    if (digest.items.length < 50) {
      digest.items.push({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        createdAt: row.createdAt,
      });
    }
    byUser.set(row.userId, digest);
  }

  return {
    windowStart,
    preparedAt: now,
    recipientCount: byUser.size,
    notificationCount: result.rows.length,
    recipients: [...byUser.entries()].map(([userId, digest]) => ({
      userId,
      ...digest,
    })),
  };
};

export const handlePaymentReconciliation: JobHandler = async () => {
  const report = await reconcilePaymentRecords({ includeProvider: true });
  return {
    generatedAt: report.generatedAt,
    ...report.summary,
    provider: report.provider
      ? {
          configured: report.provider.configured,
          checkedCount: report.provider.checkedCount,
          matchedCount: report.provider.matchedCount,
          mismatchCount: report.provider.mismatchCount,
          backfilledCount: report.provider.backfilledCount,
        }
      : null,
    exceptions: report.rows
      .filter((row) => row.reconciliationStatus !== "reconciled")
      .slice(0, 100),
    providerChecks: report.provider?.checks.slice(0, 50) ?? [],
  };
};

type PayoutPreparationRow = {
  businessId: string;
  businessName: string;
  bookingCount: number;
  amount: number;
  bookingIds: string[];
  payoutConfigured: boolean;
};

export const handlePayoutPreparation: JobHandler = async () => {
  const result = await db.execute<PayoutPreparationRow>(sql`
    select
      business.id::text as "businessId",
      business.display_name as "businessName",
      count(*)::integer as "bookingCount",
      sum(greatest(p.amount - coalesce(p.refund_amount, 0), 0))::integer as amount,
      array_agg(b.id::text order by b.created_at asc) as "bookingIds",
      (
        business.payout_gcash is not null
        or business.payout_bank is not null
      ) as "payoutConfigured"
    from bookings b
    join listings l on l.id = b.listing_id
    join businesses business on business.id = l.business_id
    join payments p on p.booking_id = b.id
    where b.status = 'completed'::booking_status
      and p.status = 'paid'::payment_status
      and greatest(p.amount - coalesce(p.refund_amount, 0), 0) > 0
      and not exists (
        select 1
        from payouts existing
        where existing.booking_ids @> array[b.id]::uuid[]
          and existing.status in (
            'pending'::payout_status,
            'completed'::payout_status
          )
      )
    group by business.id, business.display_name,
      business.payout_gcash, business.payout_bank
    order by business.display_name asc
  `);

  const batches = result.rows.map((row) => ({
    ...row,
    bookingCount: Number(row.bookingCount),
    amount: Number(row.amount),
    bookingIds: row.bookingIds ?? [],
  }));

  return {
    preparedAt: new Date(),
    batchCount: batches.length,
    eligibleBookingCount: batches.reduce(
      (total, batch) => total + batch.bookingCount,
      0,
    ),
    eligibleAmount: batches.reduce((total, batch) => total + batch.amount, 0),
    payoutSetupRequiredCount: batches.filter((batch) => !batch.payoutConfigured)
      .length,
    batches,
  };
};

export const handleSearchRefresh: JobHandler = async () => {
  const result = await db.execute<{ id: string }>(sql`
    update listings l
    set search_vector = to_tsvector(
      'english',
      trim(
        concat_ws(
          ' ',
          l.name,
          coalesce(l.description, ''),
          coalesce(l.address::text, ''),
          coalesce(l.attributes::text, '')
        )
      )
    )
    returning l.id::text
  `);
  let transportGraphRefreshed = true;
  try {
    await rebuildRouteEdges();
    await rebuildListingStopAccess();
  } catch {
    transportGraphRefreshed = false;
  }

  const { invalidateSearchCache } = await import("@/modules/search/cache");
  const { recordSearchMetric } = await import(
    "@/modules/search/observability"
  );
  const cache = invalidateSearchCache("search-refresh");
  recordSearchMetric({
    type: "freshness",
    kind: "search_index",
    stale: false,
  });
  recordSearchMetric({
    type: "freshness",
    kind: "route_data",
    stale: !transportGraphRefreshed,
  });

  return {
    refreshedAt: new Date(),
    refreshedCount: result.rows.length,
    transportGraphRefreshed,
    searchCache: cache,
  };
};

export const jobHandlers = {
  "booking-expiry": handleBookingExpiry,
  "stale-crowd-cleanup": handleStaleCrowdCleanup,
  "notification-digest": handleNotificationDigest,
  "payment-reconciliation": handlePaymentReconciliation,
  "payout-preparation": handlePayoutPreparation,
  "search-refresh": handleSearchRefresh,
} as const;

export const runBookingExpiryJob = handleBookingExpiry;
export const cleanupStaleCrowdReports = handleStaleCrowdCleanup;
export const prepareNotificationDigest = handleNotificationDigest;
export const reconcilePayments = handlePaymentReconciliation;
export const preparePayoutBatch = handlePayoutPreparation;
export const refreshSearchIndex = handleSearchRefresh;

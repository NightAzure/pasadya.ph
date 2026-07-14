import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { AuthorizationError } from "@/lib/rbac";
import {
  transitionBookingStatus,
  type BookingStatus,
} from "@/modules/bookings/state";
import { expireDueBookings } from "@/modules/bookings/service";
import {
  fetchPaymongoCheckoutSession,
  fetchPaymongoPayment,
  isProviderConfigured,
} from "./provider";

const checkoutInputSchema = z.object({
  bookingId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
});

const payoutInputSchema = z.object({
  businessId: z.string().uuid(),
  bookingIds: z.array(z.string().uuid()).min(1),
  amount: z.number().int().positive(),
  method: z.enum(["gcash", "bank_transfer"]),
});

const webhookEventSchema = z
  .object({
    id: z.string().min(1).optional(),
    eventId: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    eventType: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    sessionId: z.string().min(1).optional(),
    paymongoSessionId: z.string().min(1).optional(),
    paymentId: z.string().min(1).optional(),
    paymongoPaymentId: z.string().min(1).optional(),
    bookingId: z.string().uuid().optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    currency: z.string().optional(),
  })
  .passthrough();

const refundRequestSchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    paymentId: z.string().min(1).optional(),
    amount: z.coerce.number().int().positive().optional(),
    reason: z.string().trim().max(255).optional(),
  })
  .refine((input) => input.bookingId || input.paymentId, {
    message: "A booking or payment is required.",
  });

export type CheckoutDescriptor = {
  bookingId: string;
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: "PHP";
  isDevelopment: boolean;
};

export type WebhookResult = {
  duplicate: boolean;
  eventId: string;
  bookingId?: string;
  paymentStatus?: string;
};

export type RefundRequestDescriptor = {
  bookingId: string;
  refundId: string;
  paymentId: string;
  amount: number;
  currency: "PHP";
  status: string;
  isDevelopment: boolean;
};

export const payoutReconciliationStatuses = [
  "missing_payment",
  "payment_pending",
  "refunded",
  "payment_amount_mismatch",
  "missing_provider_payment_id",
  "payout_amount_overpaid",
  "payout_amount_mismatch",
  "ready_for_payout",
  "payout_pending",
  "reconciled",
  "not_applicable",
] as const;

export type PayoutReconciliationStatus =
  (typeof payoutReconciliationStatuses)[number];

export type PayoutReconciliationRow = {
  bookingId: string;
  listingId: string;
  listingName: string;
  businessId: string | null;
  businessName: string | null;
  bookingStatus: string;
  expectedAmount: number;
  currency: string;
  paymentId: string | null;
  providerSessionId: string | null;
  providerPaymentId: string | null;
  paymentStatus: string | null;
  paymentAmount: number | null;
  refundAmount: number;
  netPaymentAmount: number;
  payoutIds: string[];
  payoutStatus: string | null;
  payoutAmount: number;
  payoutReference: string | null;
  reconciliationStatus: PayoutReconciliationStatus;
  createdAt: Date;
};

type PayoutReconciliationDbRow = Omit<PayoutReconciliationRow, "payoutIds"> & {
  payoutIdList: string | null;
};

export type ProviderReconciliationCheck = {
  bookingId: string;
  paymentId: string | null;
  localStatus: PayoutReconciliationStatus;
  providerSource: "paymongo" | "development" | "unavailable";
  providerPaymentId: string | null;
  providerStatus: string | null;
  providerAmount: number | null;
  providerCurrency: string | null;
  match: boolean;
  action: "none" | "backfilled_payment_id" | "flagged_mismatch" | "unavailable";
  notes: string;
};

export type PayoutReconciliationReport = {
  generatedAt: Date;
  rows: PayoutReconciliationRow[];
  summary: {
    totalRows: number;
    reconciledCount: number;
    exceptionCount: number;
    readyForPayoutCount: number;
    paymentPendingCount: number;
    expectedAmount: number;
    paidAmount: number;
    payoutAmount: number;
  };
  provider?: {
    configured: boolean;
    checkedCount: number;
    matchedCount: number;
    mismatchCount: number;
    backfilledCount: number;
    checks: ProviderReconciliationCheck[];
  };
};

export type PayoutExportRow = {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  bookingIds: string[];
  method: "gcash" | "bank_transfer";
  reference: string | null;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  processedAt: Date | null;
};

export function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string,
  secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "",
) {
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").flatMap((part) => {
      const [key, value] = part.trim().split("=", 2);
      return key ? [[key, value ?? ""]] : [];
    }),
  );
  const timestamp = parts.t;
  // PayMongo signs active webhooks as `${timestamp}.${rawBody}`. The local
  // verifier historically emits `te=<hmac(rawBody)>`; keep that test-only
  // format isolated to non-production local mode.
  if (!timestamp) {
    return (
      isDevelopmentWebhookMode() &&
      safeEqualHex(
        parts.te,
        createHmac("sha256", secret).update(rawBody).digest("hex"),
      )
    );
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() - timestampSeconds * 1000) > 5 * 60_000
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return safeEqualHex(parts.li, expected) || safeEqualHex(parts.te, expected);
}

function safeEqualHex(left: string, right: string) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function createCheckoutSession(
  input: unknown,
): Promise<CheckoutDescriptor> {
  const parsed = checkoutInputSchema.parse(input);
  const booking = await getBookingForPayment(parsed.bookingId, parsed.actorId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "accepted") {
    await transitionBookingStatus(db, {
      bookingId: booking.id,
      from: "accepted",
      to: "awaiting_payment",
    });
    booking.status = "awaiting_payment";
  }
  if (booking.status !== "awaiting_payment") {
    throw new Error("Only accepted bookings can start payment.");
  }

  const existing = await db.execute<{
    sessionId: string;
    checkoutUrl: string;
  }>(sql`
    select paymongo_session_id as "sessionId",
           coalesce((select value from jsonb_each_text('{}'::jsonb) limit 1), '') as "checkoutUrl"
    from payments
    where booking_id = ${booking.id}::uuid
    limit 1
  `);
  if (existing.rows[0]?.sessionId) {
    return {
      bookingId: booking.id,
      sessionId: existing.rows[0].sessionId,
      checkoutUrl: checkoutUrlFor(booking.id, existing.rows[0].sessionId),
      amount: booking.amount,
      currency: "PHP",
      isDevelopment: isDevelopmentPaymongo(),
    };
  }

  const remote = await createRemoteCheckout(booking);
  await db.execute(sql`
    insert into payments (booking_id, paymongo_session_id, amount, status)
    values (${booking.id}::uuid, ${remote.sessionId}, ${booking.amount}, 'pending'::payment_status)
  `);

  return {
    bookingId: booking.id,
    sessionId: remote.sessionId,
    checkoutUrl: remote.checkoutUrl,
    amount: booking.amount,
    currency: "PHP",
    isDevelopment: remote.isDevelopment,
  };
}

export const createCheckoutDescriptor = createCheckoutSession;
export const createPaymentCheckout = createCheckoutSession;
export const startCheckout = createCheckoutSession;

export async function handlePaymentWebhook(
  rawBody: string | Record<string, unknown>,
  signatureHeader: string,
): Promise<WebhookResult> {
  const serializedBody =
    typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  if (!verifyPaymongoSignature(serializedBody, signatureHeader)) {
    throw new Error("Invalid PayMongo webhook signature.");
  }
  const event = normalizePaymongoEvent(
    typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody,
  );
  const eventId = event.id ?? event.eventId;
  if (!eventId) throw new Error("PayMongo webhook event ID is required.");
  const eventType = event.type ?? event.eventType ?? "unknown";

  return db.transaction(async (tx) => {
    // Inserting the event and all payment/booking effects in one transaction
    // means a failed event can be retried and a successful event is idempotent.
    const inserted = await tx.execute<{ eventId: string }>(sql`
      insert into webhook_events (event_id, event_type, payload, processed_at)
      values (${eventId}, ${eventType}, ${JSON.stringify(event)}::jsonb, now())
      on conflict (event_id) do nothing
      returning event_id as "eventId"
    `);
    if (!inserted.rows[0]) return { duplicate: true, eventId };

    const sessionId = extractSessionId(event);
    const paymentId = extractPaymentId(event);
    const payment = await tx.execute<{
      bookingId: string;
      status: string;
      amount: number;
      currency: string;
      bookingStatus: BookingStatus;
      refundAmount: number | null;
    }>(sql`
      select p.booking_id::text as "bookingId", p.status, p.amount,
             b.currency, b.status as "bookingStatus", p.refund_amount as "refundAmount"
      from payments p
      join bookings b on b.id = p.booking_id
      where ${sessionId ? sql`p.paymongo_session_id = ${sessionId}` : sql`false`}
         or ${paymentId ? sql`p.paymongo_payment_id = ${paymentId}` : sql`false`}
         or ${event.bookingId ? sql`p.booking_id = ${event.bookingId}::uuid` : sql`false`}
      order by case
        when ${sessionId ? sql`p.paymongo_session_id = ${sessionId}` : sql`false`} then 0
        when ${event.bookingId ? sql`p.booking_id = ${event.bookingId}::uuid` : sql`false`} then 1
        else 2
      end
      limit 1
      for update
    `);
    const paymentRow = payment.rows[0];
    if (!paymentRow) {
      if (
        eventType === "checkout_session.payment.paid" ||
        eventType === "payment.paid" ||
        eventType === "payment.refunded" ||
        eventType === "payment.refund.updated" ||
        eventType === "refund.succeeded"
      ) {
        throw new Error("PayMongo webhook does not identify a local payment.");
      }
      return { duplicate: false, eventId };
    }

    if (
      eventType === "checkout_session.payment.paid" ||
      eventType === "payment.paid"
    ) {
      assertPaidEventMatchesStoredPayment(event, paymentRow);
      await tx.execute(sql`
        update payments
        set status = 'paid'::payment_status,
            paymongo_payment_id = coalesce(${paymentId}, paymongo_payment_id),
            payment_method = coalesce(${extractPaymentMethod(event)}, payment_method),
            paid_at = coalesce(paid_at, now())
        where booking_id = ${paymentRow.bookingId}::uuid
      `);
      if (
        paymentRow.status !== "paid" &&
        paymentRow.bookingStatus === "awaiting_payment"
      ) {
        await transitionBookingStatus(tx, {
          bookingId: paymentRow.bookingId,
          from: "awaiting_payment",
          to: "confirmed",
        });
      }
      return {
        duplicate: false,
        eventId,
        bookingId: paymentRow.bookingId,
        paymentStatus: "paid",
      };
    }

    if (
      eventType === "payment.refunded" ||
      eventType === "payment.refund.updated" ||
      eventType === "refund.succeeded"
    ) {
      const refundAmount = extractAmount(event) ?? paymentRow.amount;
      const totalRefundAmount =
        Number(paymentRow.refundAmount ?? 0) + refundAmount;
      if (refundAmount <= 0 || totalRefundAmount > paymentRow.amount) {
        throw new Error(
          "PayMongo refund amount does not match the stored payment.",
        );
      }
      const refundStatus =
        totalRefundAmount >= paymentRow.amount
          ? "refunded"
          : "partially_refunded";
      await tx.execute(sql`
        update payments
        set status = ${refundStatus}::payment_status,
            refund_amount = ${totalRefundAmount},
            refunded_at = coalesce(refunded_at, now())
        where booking_id = ${paymentRow.bookingId}::uuid
      `);
      if (
        refundStatus === "refunded" &&
        (paymentRow.bookingStatus === "cancelled_by_guest" ||
          paymentRow.bookingStatus === "cancelled_by_owner" ||
          paymentRow.bookingStatus === "confirmed" ||
          paymentRow.bookingStatus === "completed")
      ) {
        await transitionBookingStatus(tx, {
          bookingId: paymentRow.bookingId,
          from: paymentRow.bookingStatus,
          to: "refunded",
        });
      }
      return {
        duplicate: false,
        eventId,
        bookingId: paymentRow.bookingId,
        paymentStatus: refundStatus,
      };
    }

    return { duplicate: false, eventId, bookingId: paymentRow.bookingId };
  });
}

export const handlePaymongoWebhook = handlePaymentWebhook;
export const processPaymentWebhook = handlePaymentWebhook;

/** Requests a refund for a paid booking; the webhook remains authoritative for
 * marking the local payment refunded. */
export async function requestPaymongoRefund(
  input: unknown,
): Promise<RefundRequestDescriptor> {
  const parsed = refundRequestSchema.parse(input);
  const payment = await db.execute<{
    bookingId: string;
    paymentId: string | null;
    sessionId: string;
    amount: number;
    refundAmount: number | null;
    status: string;
    currency: string;
  }>(sql`
    select p.booking_id::text as "bookingId",
           p.paymongo_payment_id as "paymentId",
           p.paymongo_session_id as "sessionId",
           p.amount, p.refund_amount as "refundAmount", p.status, b.currency
    from payments p
    join bookings b on b.id = p.booking_id
    where ${
      parsed.bookingId
        ? sql`p.booking_id = ${parsed.bookingId}::uuid`
        : sql`p.paymongo_payment_id = ${parsed.paymentId}`
    }
    limit 1
  `);
  const row = payment.rows[0];
  if (!row) throw new Error("Payment not found.");
  if (row.status !== "paid" && row.status !== "partially_refunded")
    throw new Error("Only paid payments can be refunded.");
  if (row.currency.toUpperCase() !== "PHP")
    throw new Error("Only PHP payments can be refunded.");

  const bookingId = row.bookingId;

  const amount = parsed.amount ?? row.amount;
  const remainingAmount = row.amount - Number(row.refundAmount ?? 0);
  if (amount <= 0 || amount > remainingAmount) {
    throw new Error("Refund amount must not exceed the stored payment amount.");
  }

  const paymentId: string = row.paymentId ?? row.sessionId;
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (isDevelopmentPaymongo()) {
    const refundId = `rf_test_${createHash("sha256")
      .update(`${bookingId}:${paymentId}:${amount}`)
      .digest("hex")
      .slice(0, 24)}`;
    return {
      bookingId,
      refundId,
      paymentId,
      amount,
      currency: "PHP",
      status: "pending",
      isDevelopment: true,
    };
  }

  const baseUrl = process.env.PAYMONGO_API_URL ?? "https://api.paymongo.com/v1";
  if (!key || key.startsWith("replace-with-")) {
    throw new Error("PAYMONGO_SECRET_KEY is required outside development.");
  }
  if (!row.paymentId) {
    throw new Error(
      "The PayMongo payment ID is not available for refunding yet.",
    );
  }
  const response = await fetch(`${baseUrl}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `refund:${bookingId}:${paymentId}:${amount}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount,
          payment_id: paymentId,
          reason: parsed.reason ?? "requested_by_customer",
        },
      },
    }),
  });
  if (!response.ok)
    throw new Error(`PayMongo refund request failed (${response.status}).`);
  const body = (await response.json()) as {
    data?: { id?: string; attributes?: { status?: string } };
  };
  const refundId = body.data?.id;
  if (!refundId)
    throw new Error("PayMongo returned an incomplete refund response.");
  return {
    bookingId,
    refundId,
    paymentId,
    amount,
    currency: "PHP",
    status: body.data?.attributes?.status ?? "pending",
    isDevelopment: false,
  };
}

export const requestPaymentRefund = requestPaymongoRefund;
export const createRefundRequest = requestPaymongoRefund;
export const refundPayment = requestPaymongoRefund;
export const requestRefund = requestPaymongoRefund;

export async function expireUnpaidBookings() {
  return expireDueBookings(new Date());
}

export async function createPayout(
  input: {
    businessId: string;
    bookingIds: string[];
    amount: number;
    method: "gcash" | "bank_transfer";
  },
  actorId: string,
) {
  await assertAdmin(actorId);
  payoutInputSchema.parse(input);
  const businessId = z.string().uuid().parse(input.businessId);
  const bookingIds = input.bookingIds.map((id) => z.string().uuid().parse(id));
  if (
    bookingIds.length === 0 ||
    new Set(bookingIds).size !== bookingIds.length
  ) {
    throw new Error("A payout must contain distinct bookings.");
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Payout amount must be a positive integer.");
  }

  const idList = sql.join(
    bookingIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const arrayExpression = sql`array[${idList}]::uuid[]`;

  const payout = await db.transaction(async (tx) => {
    await tx.execute(sql`
      select pg_advisory_xact_lock(hashtext(${`payout:${businessId}`}))
    `);
    const eligibleRows = await tx.execute<{
      id: string;
      businessId: string | null;
      bookingStatus: BookingStatus;
      paymentStatus: string | null;
      paymentAmount: number | null;
    }>(sql`
      select b.id::text as id, l.business_id::text as "businessId",
             b.status as "bookingStatus", p.status as "paymentStatus",
             p.amount as "paymentAmount"
      from bookings b
      join listings l on l.id = b.listing_id
      join payments p on p.booking_id = b.id
      where b.id in (${idList})
      for update of b, p
    `);
    if (eligibleRows.rows.length !== bookingIds.length) {
      throw new Error("Every payout booking must exist.");
    }
    if (
      eligibleRows.rows.some(
        (row) =>
          row.businessId !== businessId ||
          row.bookingStatus !== "completed" ||
          row.paymentStatus !== "paid",
      )
    ) {
      throw new Error(
        "Payout bookings must belong to the business, be completed, and be paid.",
      );
    }

    const eligibleAmount = eligibleRows.rows.reduce(
      (total, row) => total + Number(row.paymentAmount ?? 0),
      0,
    );
    if (input.amount !== eligibleAmount) {
      throw new Error("Payout amount must equal the eligible paid proceeds.");
    }

    const completed = await tx.execute(sql`
      select 1
      from payouts
      where status in ('pending'::payout_status, 'completed'::payout_status)
        and booking_ids && ${arrayExpression}
      limit 1
    `);
    if (completed.rows[0]) {
      throw new Error(
        "One or more bookings were already included in a completed payout.",
      );
    }

    const inserted = await tx.execute<{ id: string }>(sql`
      insert into payouts (business_id, amount, booking_ids, method, processed_by)
      values (${businessId}::uuid, ${input.amount}, ${arrayExpression},
              ${input.method}::payout_method, ${actorId}::uuid)
      returning id::text
    `);
    const id = inserted.rows[0]?.id;
    if (!id) throw new Error("Payout could not be created.");
    await tx.execute(sql`
      insert into audit_log (actor_id, action, entity_type, entity_id, changes)
      values (
        ${actorId}::uuid,
        'admin.payout.create',
        'payout',
        ${id}::uuid,
        ${JSON.stringify({ businessId, bookingIds, amount: input.amount, method: input.method })}::jsonb
      )
    `);
    return id;
  });

  return getPayout(payout);
}

export async function completePayout(
  input: { payoutId: string; reference: string },
  actorId: string,
) {
  await assertAdmin(actorId);
  const updated = await db.execute<{ id: string }>(sql`
    update payouts
    set status = 'completed'::payout_status,
        reference = ${input.reference},
        processed_by = ${actorId}::uuid,
        processed_at = now()
    where id = ${input.payoutId}::uuid and status = 'pending'::payout_status
    returning id::text
  `);
  if (!updated.rows[0]) {
    throw new Error("Payout is already completed or unavailable.");
  }
  await db.execute(sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, changes)
    values (
      ${actorId}::uuid,
      'admin.payout.complete',
      'payout',
      ${input.payoutId}::uuid,
      ${JSON.stringify({ reference: input.reference })}::jsonb
    )
  `);
  return getPayout(input.payoutId);
}

export async function listPayouts(actorId: string) {
  await assertAdmin(actorId);
  const result = await db.execute<PayoutExportRow>(sql`
    select p.id::text as id, p.business_id::text as "businessId", b.display_name as "businessName",
           p.amount, p.booking_ids as "bookingIds", p.method, p.reference, p.status,
           p.created_at as "createdAt", p.processed_at as "processedAt"
    from payouts p join businesses b on b.id = p.business_id
    order by p.created_at desc
  `);
  return result.rows;
}

export async function listPayoutExportRows(
  actorId: string,
  options: { status?: "pending" | "completed" | "failed" } = {},
) {
  await assertAdmin(actorId);
  const result = await db.execute<PayoutExportRow>(sql`
    select p.id::text as id,
           p.business_id::text as "businessId",
           b.display_name as "businessName",
           p.amount,
           p.booking_ids as "bookingIds",
           p.method,
           p.reference,
           p.status,
           p.created_at as "createdAt",
           p.processed_at as "processedAt"
    from payouts p
    join businesses b on b.id = p.business_id
    where (${options.status ?? null}::text is null or p.status::text = ${options.status ?? null})
    order by p.created_at desc
  `);
  return result.rows;
}

export async function getPayoutReconciliation(
  actorId: string,
): Promise<PayoutReconciliationReport> {
  await assertAdmin(actorId);
  return loadPayoutReconciliation();
}

export async function reconcilePaymentRecords(
  options: { includeProvider?: boolean; maxProviderChecks?: number } = {},
): Promise<PayoutReconciliationReport> {
  const report = await loadPayoutReconciliation();
  if (options.includeProvider === false) {
    return report;
  }
  return attachProviderReconciliation(report, {
    maxChecks: options.maxProviderChecks ?? 50,
  });
}

async function attachProviderReconciliation(
  report: PayoutReconciliationReport,
  options: { maxChecks: number },
): Promise<PayoutReconciliationReport> {
  const configured = isProviderConfigured();
  const candidateStatuses = new Set<PayoutReconciliationStatus>([
    "payment_pending",
    "missing_provider_payment_id",
    "payment_amount_mismatch",
    "ready_for_payout",
    "reconciled",
  ]);
  const candidates = report.rows
    .filter(
      (row) =>
        row.paymentId &&
        (row.providerPaymentId || row.providerSessionId) &&
        candidateStatuses.has(row.reconciliationStatus),
    )
    .slice(0, options.maxChecks);

  const checks: ProviderReconciliationCheck[] = [];
  let matchedCount = 0;
  let mismatchCount = 0;
  let backfilledCount = 0;

  for (const row of candidates) {
    try {
      let providerPaymentId = row.providerPaymentId;
      let providerSource: ProviderReconciliationCheck["providerSource"] =
        configured ? "paymongo" : "development";
      let providerStatus: string | null = null;
      let providerAmount: number | null = null;
      let providerCurrency: string | null = null;
      let action: ProviderReconciliationCheck["action"] = "none";
      let notes = "Provider payment matched local records.";

      if (!providerPaymentId && row.providerSessionId) {
        const session = await fetchPaymongoCheckoutSession(
          row.providerSessionId,
          {
            expectedAmount: row.paymentAmount ?? row.expectedAmount,
            expectedCurrency: row.currency,
          },
        );
        if (!session) {
          checks.push({
            bookingId: row.bookingId,
            paymentId: row.paymentId,
            localStatus: row.reconciliationStatus,
            providerSource: "unavailable",
            providerPaymentId: null,
            providerStatus: null,
            providerAmount: null,
            providerCurrency: null,
            match: false,
            action: "unavailable",
            notes: "Checkout session was not found at the provider.",
          });
          mismatchCount += 1;
          continue;
        }
        providerPaymentId = session.paymentIds[0] ?? null;
        providerSource = session.source;
        providerStatus = session.status;
        providerAmount = session.amount;
        providerCurrency = session.currency;

        if (providerPaymentId && row.paymentId) {
          await db.execute(sql`
            update payments
            set paymongo_payment_id = coalesce(paymongo_payment_id, ${providerPaymentId})
            where id = ${row.paymentId}::uuid
              and paymongo_payment_id is null
          `);
          action = "backfilled_payment_id";
          notes = `Backfilled provider payment ID ${providerPaymentId} from checkout session.`;
          backfilledCount += 1;
        }
      }

      if (providerPaymentId) {
        const payment = await fetchPaymongoPayment(providerPaymentId, {
          expectedAmount: row.paymentAmount ?? row.expectedAmount,
          expectedCurrency: row.currency,
          checkoutSessionId: row.providerSessionId,
        });
        if (!payment) {
          checks.push({
            bookingId: row.bookingId,
            paymentId: row.paymentId,
            localStatus: row.reconciliationStatus,
            providerSource: "unavailable",
            providerPaymentId,
            providerStatus: null,
            providerAmount: null,
            providerCurrency: null,
            match: false,
            action: "unavailable",
            notes: "Provider payment was not found.",
          });
          mismatchCount += 1;
          continue;
        }
        providerSource = payment.source;
        providerStatus = payment.status;
        providerAmount = payment.amount;
        providerCurrency = payment.currency;
      }

      const amountMatches =
        providerAmount === null ||
        row.paymentAmount === null ||
        providerAmount === row.paymentAmount;
      const currencyMatches =
        !providerCurrency || providerCurrency === row.currency.toUpperCase();
      const statusLooksPaid =
        !providerStatus ||
        ["paid", "succeeded", "successful"].includes(
          providerStatus.toLowerCase(),
        );
      const match = amountMatches && currencyMatches && statusLooksPaid;

      if (!match) {
        action = "flagged_mismatch";
        notes = "Provider settlement does not match local payment records.";
        mismatchCount += 1;
      } else {
        matchedCount += 1;
      }

      checks.push({
        bookingId: row.bookingId,
        paymentId: row.paymentId,
        localStatus: row.reconciliationStatus,
        providerSource,
        providerPaymentId,
        providerStatus,
        providerAmount,
        providerCurrency,
        match,
        action,
        notes,
      });
    } catch (error) {
      checks.push({
        bookingId: row.bookingId,
        paymentId: row.paymentId,
        localStatus: row.reconciliationStatus,
        providerSource: "unavailable",
        providerPaymentId: row.providerPaymentId,
        providerStatus: null,
        providerAmount: null,
        providerCurrency: null,
        match: false,
        action: "unavailable",
        notes:
          error instanceof Error
            ? error.message
            : "Provider reconciliation failed.",
      });
      mismatchCount += 1;
    }
  }

  if (checks.length > 0) {
    await db.execute(sql`
      insert into audit_log (actor_id, action, entity_type, entity_id, changes)
      values (
        null,
        'admin.payment.reconcile.provider',
        'payment',
        ${checks[0]?.paymentId ?? checks[0]?.bookingId}::uuid,
        ${JSON.stringify({
          configured,
          checkedCount: checks.length,
          matchedCount,
          mismatchCount,
          backfilledCount,
          checks: checks.slice(0, 25),
        })}::jsonb
      )
    `);
  }

  return {
    ...report,
    provider: {
      configured,
      checkedCount: checks.length,
      matchedCount,
      mismatchCount,
      backfilledCount,
      checks,
    },
  };
}

async function loadPayoutReconciliation(): Promise<PayoutReconciliationReport> {
  const result = await db.execute<PayoutReconciliationDbRow>(sql`
    select
      b.id::text as "bookingId",
      l.id::text as "listingId",
      l.name as "listingName",
      l.business_id::text as "businessId",
      business.display_name as "businessName",
      b.status as "bookingStatus",
      b.downpayment_amount as "expectedAmount",
      b.currency,
      p.id::text as "paymentId",
      p.paymongo_session_id as "providerSessionId",
      p.paymongo_payment_id as "providerPaymentId",
      p.status as "paymentStatus",
      p.amount as "paymentAmount",
      coalesce(p.refund_amount, 0)::integer as "refundAmount",
      greatest(coalesce(p.amount, 0) - coalesce(p.refund_amount, 0), 0)::integer as "netPaymentAmount",
      coalesce(payout.payout_ids, '') as "payoutIdList",
      payout.payout_status as "payoutStatus",
      coalesce(payout.payout_amount, 0)::integer as "payoutAmount",
      payout.payout_reference as "payoutReference",
      case
        when p.id is null then 'missing_payment'
        when p.status in ('pending'::payment_status, 'failed'::payment_status) then 'payment_pending'
        when p.status in ('refunded'::payment_status, 'partially_refunded'::payment_status) then 'refunded'
        when p.amount <> b.downpayment_amount then 'payment_amount_mismatch'
        when p.status = 'paid'::payment_status and p.paymongo_payment_id is null then 'missing_provider_payment_id'
        when p.status = 'paid'::payment_status
          and payout.payout_amount > greatest(p.amount - coalesce(p.refund_amount, 0), 0)
          then 'payout_amount_overpaid'
        when p.status = 'paid'::payment_status
          and payout.payout_amount > 0
          and payout.payout_amount <> greatest(p.amount - coalesce(p.refund_amount, 0), 0)
          then 'payout_amount_mismatch'
        when b.status = 'completed'::booking_status
          and p.status = 'paid'::payment_status
          and payout.payout_amount = 0
          then 'ready_for_payout'
        when payout.payout_status like '%pending%' then 'payout_pending'
        when p.status = 'paid'::payment_status
          and payout.payout_amount = greatest(p.amount - coalesce(p.refund_amount, 0), 0)
          then 'reconciled'
        else 'not_applicable'
      end as "reconciliationStatus",
      b.created_at as "createdAt"
    from bookings b
    join listings l on l.id = b.listing_id
    left join businesses business on business.id = l.business_id
    left join payments p on p.booking_id = b.id
    left join lateral (
      select
        coalesce(
          sum(p2.amount) filter (
            where p2.status in ('pending'::payout_status, 'completed'::payout_status)
          ),
          0
        )::integer as payout_amount,
        string_agg(
          p2.id::text,
          ',' order by p2.created_at desc
        ) filter (
          where p2.status in ('pending'::payout_status, 'completed'::payout_status)
        ) as payout_ids,
        string_agg(
          distinct p2.status::text,
          ',' order by p2.status::text
        ) as payout_status,
        max(p2.reference) filter (
          where p2.status in ('pending'::payout_status, 'completed'::payout_status)
        ) as payout_reference
      from payouts p2
      where p2.booking_ids @> array[b.id]::uuid[]
    ) payout on true
    order by b.created_at desc
    limit 5000
  `);

  const rows: PayoutReconciliationRow[] = result.rows.map((row) => ({
    ...row,
    expectedAmount: Number(row.expectedAmount),
    paymentAmount:
      row.paymentAmount === null ? null : Number(row.paymentAmount),
    refundAmount: Number(row.refundAmount ?? 0),
    netPaymentAmount: Number(row.netPaymentAmount ?? 0),
    payoutIds: row.payoutIdList ? row.payoutIdList.split(",") : [],
    payoutAmount: Number(row.payoutAmount ?? 0),
    reconciliationStatus: row.reconciliationStatus,
  }));
  const exceptionStatuses = new Set<PayoutReconciliationStatus>([
    "missing_payment",
    "payment_pending",
    "refunded",
    "payment_amount_mismatch",
    "missing_provider_payment_id",
    "payout_amount_overpaid",
    "payout_amount_mismatch",
    "ready_for_payout",
    "payout_pending",
  ]);

  return {
    generatedAt: new Date(),
    rows,
    summary: {
      totalRows: rows.length,
      reconciledCount: rows.filter(
        (row) => row.reconciliationStatus === "reconciled",
      ).length,
      exceptionCount: rows.filter((row) =>
        exceptionStatuses.has(row.reconciliationStatus),
      ).length,
      readyForPayoutCount: rows.filter(
        (row) => row.reconciliationStatus === "ready_for_payout",
      ).length,
      paymentPendingCount: rows.filter(
        (row) => row.reconciliationStatus === "payment_pending",
      ).length,
      expectedAmount: rows.reduce(
        (total, row) => total + row.expectedAmount,
        0,
      ),
      paidAmount: rows.reduce(
        (total, row) => total + Number(row.paymentAmount ?? 0),
        0,
      ),
      payoutAmount: rows.reduce((total, row) => total + row.payoutAmount, 0),
    },
  };
}

export async function listOwnerPayouts(actorId: string) {
  const result = await db.execute(sql`
    select p.id::text as id, p.business_id::text as "businessId",
           b.display_name as "businessName", p.amount,
           p.booking_ids as "bookingIds", p.method, p.reference, p.status,
           p.created_at as "createdAt", p.processed_at as "processedAt"
    from payouts p
    join businesses b on b.id = p.business_id
    where b.owner_id = ${actorId}::uuid
    order by p.created_at desc
  `);
  return result.rows;
}

async function getPayout(id: string) {
  const result = await db.execute(sql`
    select p.id::text as id, p.business_id::text as "businessId", b.display_name as "businessName",
           p.amount, p.booking_ids as "bookingIds", p.method, p.reference, p.status,
           p.created_at as "createdAt", p.processed_at as "processedAt"
    from payouts p join businesses b on b.id = p.business_id
    where p.id = ${id}::uuid limit 1
  `);
  return result.rows[0] ?? null;
}

async function assertAdmin(actorId: string) {
  if (!z.string().uuid().safeParse(actorId).success) {
    throw new AuthorizationError("Admin access required.");
  }
  const result = await db.execute(sql`
    select 1 from users where id = ${actorId}::uuid and role = 'admin'::user_role limit 1
  `);
  if (!result.rows[0]) throw new AuthorizationError("Admin access required.");
}

async function getBookingForPayment(bookingId: string, actorId?: string) {
  const result = await db.execute<{
    id: string;
    status: BookingStatus;
    amount: number;
    userId: string;
  }>(sql`
    select b.id::text as id, b.status, b.downpayment_amount as amount, b.user_id::text as "userId"
    from bookings b where b.id = ${bookingId}::uuid limit 1
  `);
  const booking = result.rows[0];
  if (!booking || (actorId && booking.userId !== actorId)) {
    if (actorId) throw new AuthorizationError("Booking access required.");
    return null;
  }
  return booking;
}

async function createRemoteCheckout(booking: { id: string; amount: number }) {
  const key = process.env.PAYMONGO_SECRET_KEY;
  const isDevelopment = isDevelopmentPaymongo();
  if (isDevelopmentPaymongo()) {
    const sessionId = `cs_test_${booking.id.replaceAll("-", "").slice(0, 20)}`;
    return {
      sessionId,
      checkoutUrl: checkoutUrlFor(booking.id, sessionId),
      isDevelopment: true,
    };
  }
  if (!key || key.startsWith("replace-with-")) {
    throw new Error("PAYMONGO_SECRET_KEY is required outside development.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const response = await fetch(
    "https://api.paymongo.com/v2/checkout_sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                currency: "PHP",
                amount: booking.amount,
                name: "Pasadya booking downpayment",
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "paymaya", "card", "qrph"],
            success_url: `${baseUrl}/account/bookings/${booking.id}?payment=return`,
            cancel_url: `${baseUrl}/account/bookings/${booking.id}?payment=cancelled`,
            description: `Booking ${booking.id}`,
            metadata: { bookingId: booking.id },
          },
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(`PayMongo checkout failed (${response.status}).`);
  const body = (await response.json()) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
  };
  const sessionId = body.data?.id;
  const checkoutUrl = body.data?.attributes?.checkout_url;
  if (!sessionId || !checkoutUrl)
    throw new Error("PayMongo returned an incomplete checkout session.");
  return { sessionId, checkoutUrl, isDevelopment };
}

function extractSessionId(event: z.infer<typeof webhookEventSchema>) {
  const data = event.data as
    | {
        id?: unknown;
        attributes?: {
          checkout_session_id?: unknown;
          metadata?: { bookingId?: unknown };
        };
      }
    | undefined;
  return (
    event.sessionId ??
    event.paymongoSessionId ??
    (typeof data?.id === "string" ? data.id : undefined) ??
    (typeof data?.attributes?.checkout_session_id === "string"
      ? data.attributes.checkout_session_id
      : undefined)
  );
}

function normalizePaymongoEvent(input: unknown) {
  const event = webhookEventSchema.parse(input);
  const envelope = asRecord(event.data);
  const envelopeAttributes = asRecord(envelope?.attributes);
  const nestedResource = asRecord(envelopeAttributes?.data);
  return {
    ...event,
    id:
      event.id ??
      event.eventId ??
      (typeof envelope?.id === "string" ? envelope.id : undefined),
    type:
      event.type ??
      event.eventType ??
      (typeof envelopeAttributes?.type === "string"
        ? envelopeAttributes.type
        : undefined),
    data: nestedResource ?? event.data,
  };
}

function extractPaymentId(event: z.infer<typeof webhookEventSchema>) {
  const data = event.data as
    { attributes?: { payments?: Array<{ id?: string }> } } | undefined;
  return (
    event.paymentId ??
    event.paymongoPaymentId ??
    data?.attributes?.payments?.[0]?.id ??
    null
  );
}

function extractPaymentMethod(_event: z.infer<typeof webhookEventSchema>) {
  void _event;
  return null;
}

function assertPaidEventMatchesStoredPayment(
  event: z.infer<typeof webhookEventSchema>,
  payment: { amount: number; currency: string },
) {
  const eventAmount = extractAmount(event);
  const eventCurrency = extractCurrency(event);
  if (eventAmount === undefined || eventCurrency === undefined) {
    if (isDevelopmentWebhookMode()) return;
    throw new Error("PayMongo paid event is missing amount or currency.");
  }
  if (eventAmount !== payment.amount || eventCurrency !== payment.currency) {
    throw new Error(
      "PayMongo paid event amount or currency does not match the stored payment.",
    );
  }
}

function extractAmount(event: z.infer<typeof webhookEventSchema>) {
  const data = asRecord(event.data);
  const attributes = asRecord(data?.attributes);
  const payment = Array.isArray(attributes?.payments)
    ? asRecord(attributes.payments[0])
    : undefined;
  const paymentAttributes = asRecord(payment?.attributes);
  const lineItem = Array.isArray(attributes?.line_items)
    ? asRecord(attributes.line_items[0])
    : undefined;
  const value =
    event.amount ??
    attributes?.amount ??
    payment?.amount ??
    paymentAttributes?.amount ??
    lineItem?.amount;
  if (typeof value === "number")
    return Number.isInteger(value) ? value : undefined;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function extractCurrency(event: z.infer<typeof webhookEventSchema>) {
  const data = asRecord(event.data);
  const attributes = asRecord(data?.attributes);
  const payment = Array.isArray(attributes?.payments)
    ? asRecord(attributes.payments[0])
    : undefined;
  const paymentAttributes = asRecord(payment?.attributes);
  const lineItem = Array.isArray(attributes?.line_items)
    ? asRecord(attributes.line_items[0])
    : undefined;
  const value =
    event.currency ??
    attributes?.currency ??
    payment?.currency ??
    paymentAttributes?.currency ??
    lineItem?.currency;
  return typeof value === "string" ? value.toUpperCase() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function checkoutUrlFor(bookingId: string, sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/account/bookings/${bookingId}?checkout=${encodeURIComponent(sessionId)}`;
}

function isDevelopmentPaymongo() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  return (
    process.env.NODE_ENV !== "production" &&
    (!key || key.startsWith("replace-with-"))
  );
}

function isDevelopmentWebhookMode() {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.NODE_ENV === "development" ||
    process.env.PAYMONGO_WEBHOOK_DEVELOPMENT === "true" ||
    isDevelopmentPaymongo()
  );
}

import type { PayoutSummary } from "@/components/booking/contracts";
import {
  completePayout,
  createPayout,
  getPayoutReconciliation,
  listPayoutExportRows,
  listPayouts,
} from "@/modules/payments";
import type {
  PayoutReconciliationReport as PaymentReconciliationReport,
  PayoutReconciliationRow as PaymentReconciliationRow,
} from "@/modules/payments/service";

export type CreatePayoutInput = {
  businessId: string;
  bookingIds: string[];
  amount: number;
  method: "gcash" | "bank_transfer";
};

export type CompletePayoutInput = {
  payoutId: string;
  reference: string;
};

export type PayoutReconciliation = Omit<
  PaymentReconciliationReport,
  "generatedAt" | "rows"
> & {
  generatedAt: string;
  rows: Array<
    Omit<PaymentReconciliationRow, "createdAt"> & { createdAt: string }
  >;
};

export type PayoutDomain = {
  listPayouts: (actorId: string) => Promise<PayoutSummary[]>;
  listPayoutExportRows: (
    actorId: string,
    options?: { status?: "pending" | "completed" | "failed" },
  ) => Promise<PayoutSummary[]>;
  getPayoutReconciliation: (actorId: string) => Promise<PayoutReconciliation>;
  createPayout: (
    input: CreatePayoutInput,
    actorId: string,
  ) => Promise<PayoutSummary>;
  completePayout: (
    input: CompletePayoutInput,
    actorId: string,
  ) => Promise<PayoutSummary>;
};

/** Keeps admin routes on the payments/payouts public API boundary. */
export async function getPayoutDomain(): Promise<PayoutDomain> {
  return {
    createPayout: async (input, actorId) =>
      normalizePayout(await createPayout(input, actorId)),
    completePayout: async (input, actorId) =>
      normalizePayout(await completePayout(input, actorId)),
    listPayouts: async (actorId) =>
      (await listPayouts(actorId)).map(normalizePayout),
    listPayoutExportRows: async (actorId, options) =>
      (await listPayoutExportRows(actorId, options)).map(normalizePayout),
    getPayoutReconciliation: async (actorId) =>
      normalizeReconciliation(await getPayoutReconciliation(actorId)),
  };
}

function normalizePayout(value: Record<string, unknown>): PayoutSummary {
  const dateValue = (input: unknown) =>
    input instanceof Date ? input.toISOString() : String(input ?? "");
  return {
    id: String(value.id ?? ""),
    businessId: String(value.businessId ?? ""),
    businessName: String(value.businessName ?? ""),
    amount: Number(value.amount ?? 0),
    bookingIds: Array.isArray(value.bookingIds)
      ? value.bookingIds.map(String)
      : [],
    method: value.method === "bank_transfer" ? "bank_transfer" : "gcash",
    reference: value.reference == null ? null : String(value.reference),
    status:
      value.status === "completed" || value.status === "failed"
        ? value.status
        : "pending",
    createdAt: dateValue(value.createdAt),
    processedAt:
      value.processedAt == null ? null : dateValue(value.processedAt),
  };
}

function normalizeReconciliation(
  value: PaymentReconciliationReport,
): PayoutReconciliation {
  return {
    generatedAt: dateValue(value.generatedAt),
    summary: value.summary,
    rows: value.rows.map((row) => ({
      ...row,
      createdAt: dateValue(row.createdAt),
    })),
  };
}

function dateValue(input: unknown) {
  return input instanceof Date ? input.toISOString() : String(input ?? "");
}

export function payoutDomainUnavailable() {
  return {
    error: "Payout service is not available in this checkout yet.",
    code: "PAYOUT_DOMAIN_MISSING",
  } as const;
}

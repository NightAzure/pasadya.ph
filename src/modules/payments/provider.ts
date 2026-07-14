import { createHash } from "node:crypto";

export type ProviderPaymentSnapshot = {
  id: string;
  status: string;
  amount: number | null;
  currency: string | null;
  checkoutSessionId: string | null;
  source: "paymongo" | "development";
};

export type ProviderCheckoutSnapshot = {
  id: string;
  status: string;
  paymentIds: string[];
  amount: number | null;
  currency: string | null;
  source: "paymongo" | "development";
};

function isDevelopmentPaymongo() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  return (
    process.env.NODE_ENV !== "production" &&
    (!key || key.startsWith("replace-with-"))
  );
}

function paymongoAuthHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key || key.startsWith("replace-with-")) {
    throw new Error("PAYMONGO_SECRET_KEY is required outside development.");
  }
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function paymongoBaseUrl() {
  return process.env.PAYMONGO_API_URL ?? "https://api.paymongo.com/v1";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function readAmount(attributes: Record<string, unknown> | undefined) {
  const value = attributes?.amount;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function readCurrency(attributes: Record<string, unknown> | undefined) {
  return typeof attributes?.currency === "string"
    ? attributes.currency.toUpperCase()
    : null;
}

/** Fetches a PayMongo payment. In development without credentials, returns a
 * deterministic stub derived from the local payment identifiers. */
export async function fetchPaymongoPayment(
  paymentId: string,
  options: {
    expectedAmount?: number;
    expectedCurrency?: string;
    checkoutSessionId?: string | null;
  } = {},
): Promise<ProviderPaymentSnapshot | null> {
  if (!paymentId) return null;

  if (isDevelopmentPaymongo()) {
    return {
      id: paymentId,
      status: "paid",
      amount: options.expectedAmount ?? null,
      currency: (options.expectedCurrency ?? "PHP").toUpperCase(),
      checkoutSessionId: options.checkoutSessionId ?? null,
      source: "development",
    };
  }

  const response = await fetch(`${paymongoBaseUrl()}/payments/${paymentId}`, {
    headers: {
      Authorization: paymongoAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`PayMongo payment fetch failed (${response.status}).`);
  }

  const body = (await response.json()) as { data?: unknown };
  const data = asRecord(body.data);
  const attributes = asRecord(data?.attributes);
  return {
    id: typeof data?.id === "string" ? data.id : paymentId,
    status:
      typeof attributes?.status === "string" ? attributes.status : "unknown",
    amount: readAmount(attributes),
    currency: readCurrency(attributes),
    checkoutSessionId:
      typeof attributes?.checkout_session_id === "string"
        ? attributes.checkout_session_id
        : (options.checkoutSessionId ?? null),
    source: "paymongo",
  };
}

/** Fetches a PayMongo checkout session and any nested payment IDs. */
export async function fetchPaymongoCheckoutSession(
  sessionId: string,
  options: {
    expectedAmount?: number;
    expectedCurrency?: string;
  } = {},
): Promise<ProviderCheckoutSnapshot | null> {
  if (!sessionId) return null;

  if (isDevelopmentPaymongo()) {
    const paymentId = `pay_test_${createHash("sha256")
      .update(sessionId)
      .digest("hex")
      .slice(0, 24)}`;
    return {
      id: sessionId,
      status: "paid",
      paymentIds: [paymentId],
      amount: options.expectedAmount ?? null,
      currency: (options.expectedCurrency ?? "PHP").toUpperCase(),
      source: "development",
    };
  }

  const response = await fetch(
    `${paymongoBaseUrl()}/checkout_sessions/${sessionId}`,
    {
      headers: {
        Authorization: paymongoAuthHeader(),
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `PayMongo checkout session fetch failed (${response.status}).`,
    );
  }

  const body = (await response.json()) as { data?: unknown };
  const data = asRecord(body.data);
  const attributes = asRecord(data?.attributes);
  const payments = Array.isArray(attributes?.payments)
    ? attributes.payments
    : [];
  const paymentIds = payments
    .map((payment) => asRecord(payment)?.id)
    .filter((id): id is string => typeof id === "string");

  return {
    id: typeof data?.id === "string" ? data.id : sessionId,
    status:
      typeof attributes?.status === "string" ? attributes.status : "unknown",
    paymentIds,
    amount: readAmount(attributes),
    currency: readCurrency(attributes),
    source: "paymongo",
  };
}

export function isProviderConfigured() {
  return !isDevelopmentPaymongo();
}

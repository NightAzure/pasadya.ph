import { z } from "zod";

export const cancellationPolicies = ["flexible", "moderate", "strict"] as const;
export type CancellationPolicy = (typeof cancellationPolicies)[number];

export const refundCalculationInputSchema = z.object({
  policy: z.enum(cancellationPolicies),
  amountPaid: z.coerce.number().int().nonnegative(),
  checkIn: z.string().date(),
  at: z.coerce.date().default(() => new Date()),
});

export type RefundCalculation = {
  policy: CancellationPolicy;
  amountPaid: number;
  refundAmount: number;
  refundPercent: number;
  reason: string;
};

const hoursBetween = (from: Date, to: Date) =>
  (to.getTime() - from.getTime()) / (60 * 60 * 1000);

/**
 * MVP policy rules, expressed against the amount actually paid:
 * flexible: 100% at least 48h before check-in;
 * moderate: 50% at least 5 days before check-in;
 * strict: non-refundable.
 */
export function calculateRefund(input: unknown): RefundCalculation {
  const parsed = refundCalculationInputSchema.parse(input);
  const checkIn = new Date(`${parsed.checkIn}T00:00:00.000Z`);
  const hoursUntilCheckIn = hoursBetween(parsed.at, checkIn);

  let refundPercent = 0;
  let reason = "The cancellation is outside the refundable window.";

  if (parsed.policy === "flexible") {
    refundPercent = hoursUntilCheckIn >= 48 ? 100 : 0;
    reason =
      refundPercent === 100
        ? "Flexible policy: cancellation at least 48 hours before check-in."
        : reason;
  } else if (parsed.policy === "moderate") {
    refundPercent = hoursUntilCheckIn >= 120 ? 50 : 0;
    reason =
      refundPercent === 50
        ? "Moderate policy: cancellation at least 5 days before check-in."
        : reason;
  } else {
    refundPercent = 0;
    reason = "Strict policy: the downpayment is non-refundable.";
  }

  const refundAmount = Math.floor((parsed.amountPaid * refundPercent) / 100);
  return {
    policy: parsed.policy,
    amountPaid: parsed.amountPaid,
    refundAmount,
    refundPercent,
    reason,
  };
}

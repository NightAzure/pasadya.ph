"use client";

import { useRef, useState } from "react";

import { formatBookingMoney } from "@/components/booking/contracts";
import { Button } from "@/components/ui/button";
import type {
  AuthoritativeQuote,
  QuoteResult,
} from "@/modules/pricing/service";

type Rate = { id: string; name: string; billingPeriod?: string | null };

export function QuotePanel({
  listingId,
  rates,
  title = "Check your exact total",
  initialQuote,
}: {
  listingId: string;
  rates: Rate[];
  title?: string;
  initialQuote?: {
    ratePlanId?: string;
    checkIn?: string;
    checkOut?: string;
    pax?: number;
    requestedUnits?: number;
    durationHours?: number;
  };
}) {
  const [ratePlanId, setRatePlanId] = useState(
    initialQuote?.ratePlanId ?? rates[0]?.id ?? "",
  );
  const [checkIn, setCheckIn] = useState(initialQuote?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initialQuote?.checkOut ?? "");
  const [pax, setPax] = useState(String(initialQuote?.pax ?? 2));
  const [units, setUnits] = useState(String(initialQuote?.requestedUnits ?? 1));
  const [durationHours, setDurationHours] = useState(
    initialQuote?.durationHours ? String(initialQuote.durationHours) : "",
  );
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  const selected = rates.find((rate) => rate.id === ratePlanId);

  async function checkQuote() {
    const version = ++requestVersion.current;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId,
          ratePlanId,
          checkIn,
          checkOut,
          pax: Number(pax),
          requestedUnits: Number(units),
          ...(durationHours ? { durationHours: Number(durationHours) } : {}),
        }),
      });
      const payload = (await response.json()) as
        QuoteResult | { error: string };
      if (version === requestVersion.current)
        setResult(
          "ok" in payload
            ? payload
            : {
                ok: false,
                rejections: [
                  { code: "RATE_DATA_INCOMPLETE", message: payload.error },
                ],
              },
        );
    } catch {
      if (version === requestVersion.current)
        setResult({
          ok: false,
          rejections: [
            {
              code: "RATE_DATA_INCOMPLETE",
              message:
                "We could not check the total right now. Please try again.",
            },
          ],
        });
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
      aria-labelledby={`${listingId}-quote-title`}
    >
      <div>
        <h2 className="text-lg font-semibold" id={`${listingId}-quote-title`}>
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your visit details. We will only show the total returned by the
          booking quote service.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Rate" value={ratePlanId} onChange={setRatePlanId}>
          {rates.map((rate) => (
            <option key={rate.id} value={rate.id}>
              {rate.name}
            </option>
          ))}
        </Select>
        <Field label="Guests" min="1" value={pax} onChange={setPax} />
        <Field
          label="Check-in"
          type="date"
          value={checkIn}
          onChange={setCheckIn}
        />
        <Field
          label="Check-out"
          type="date"
          value={checkOut}
          onChange={setCheckOut}
        />
        <Field
          label="Rooms or units"
          min="1"
          value={units}
          onChange={setUnits}
        />
        {selected?.billingPeriod === "hour" ? (
          <Field
            label="Visit duration (hours)"
            min="1"
            max="24"
            value={durationHours}
            onChange={setDurationHours}
          />
        ) : null}
      </div>
      <Button
        className="w-full"
        disabled={loading || !ratePlanId || !checkIn || !checkOut}
        onClick={checkQuote}
        type="button"
      >
        {loading ? "Checking total…" : "Check availability and total"}
      </Button>
      <div aria-live="polite" className="text-sm">
        {loading ? (
          <p className="text-muted-foreground">Checking total…</p>
        ) : null}
        {result?.ok ? <QuoteSummary quote={result.quote} /> : null}
        {result && !result.ok ? (
          <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-muted-foreground">
            Exact total unavailable: {result.rejections[0]?.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function QuoteSummary({ quote }: { quote: AuthoritativeQuote }) {
  return (
    <div className="space-y-2 rounded-md border border-success/30 bg-success/10 p-3">
      <p className="font-semibold tabular-nums">
        Total: {formatBookingMoney(quote.subtotal)}
      </p>
      <p className="text-muted-foreground">
        {quote.pax} guests · {quote.reservedUnits}{" "}
        {quote.billing.inventoryUnitLabel}
        {quote.reservedUnits === 1 ? "" : "s"}
      </p>
      <ul className="space-y-1 text-muted-foreground">
        <li>
          Rate and extra guests:{" "}
          {formatBookingMoney(quote.subtotal - quote.mandatoryFee.amount)}
        </li>
        {quote.mandatoryFee.amount ? (
          <li>
            {quote.mandatoryFee.label ?? "Mandatory fee/tax"}:{" "}
            {formatBookingMoney(quote.mandatoryFee.amount)}
          </li>
        ) : null}
        <li>
          Due now: {formatBookingMoney(quote.downpaymentAmount)} · Balance at
          venue: {formatBookingMoney(quote.balanceDue)}
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        {quote.trust.verifiedTotalEligible
          ? "Fresh verified pricing and availability evidence."
          : "Exact owner-provided quote; verification freshness is shown separately."}
      </p>
    </div>
  );
}

function Field({
  label,
  type = "number",
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        className="mt-2 min-h-12 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

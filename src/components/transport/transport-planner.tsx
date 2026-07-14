"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TransportSteps } from "@/components/transport/transport-steps";
import type { Journey, TransportPlace } from "@/modules/transport/service";

type Destination = TransportPlace & { area: string };

export function TransportPlanner({
  origins,
  destinations,
  initialJourney,
  initialDestinationId,
}: {
  origins: TransportPlace[];
  destinations: Destination[];
  initialJourney: Journey | null;
  initialDestinationId?: string;
}) {
  const [originId, setOriginId] = useState(origins[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(
    initialDestinationId ?? destinations[0]?.id ?? "",
  );
  const [journey, setJourney] = useState<Journey | null>(initialJourney);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const origin = origins.find((place) => place.id === originId);
    const destination = destinations.find(
      (place) => place.id === destinationId,
    );
    if (!origin || !destination) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/transport/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origin,
          originLabel: origin.label,
          destination,
          destinationLabel: destination.label,
        }),
      });
      const result = await response.json();
      setJourney(result.journey ?? null);
      setStatus(result.message ?? "");
    } catch {
      setJourney(null);
      setStatus("We could not load directions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="grid gap-4 rounded-md border bg-card p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={submit}
      >
        <label className="block">
          <span className="text-sm font-medium">From</span>
          <select
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => setOriginId(event.target.value)}
            value={originId}
          >
            {origins.map((place) => (
              <option key={place.id} value={place.id}>
                {place.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">To</span>
          <select
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => setDestinationId(event.target.value)}
            value={destinationId}
          >
            {destinations.map((place) => (
              <option key={place.id} value={place.id}>
                {place.label} · {place.area}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={loading} size="lg" type="submit">
          {loading ? "Planning…" : "Get directions"}
        </Button>
      </form>
      {journey ? (
        <TransportSteps journey={journey} />
      ) : (
        <div className="rounded-md border border-dashed bg-card p-5 text-center">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto h-6 w-6 text-warning"
          />
          <p className="mt-2 font-semibold">
            {status || "No route found for this pair yet."}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Try a seeded Davao or Samal place. You can also help map an
            uncovered corridor below.
          </p>
        </div>
      )}
    </div>
  );
}

export function ContributionForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/transport/contributions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(
        response.status === 401
          ? "Sign in before submitting a route correction."
          : (result.message ?? "Please check the route details."),
      );
      return;
    }
    setSuccess(true);
    setMessage(result.message ?? "Contribution submitted for review.");
    event.currentTarget.reset();
  }
  return (
    <form
      className="space-y-4 rounded-md border bg-card p-4 shadow-sm"
      onSubmit={submit}
    >
      <div className="flex items-start gap-3">
        <Send aria-hidden="true" className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Help map a route</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Suggest a new corridor or correction. A moderator reviews every
            submission before it can affect public directions.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Route name"
          name="routeName"
          placeholder="e.g. Bajada to Sasa"
          required
        />
        <label className="block">
          <span className="text-sm font-medium">Contribution type</span>
          <select
            className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue="correction"
            name="type"
          >
            <option value="new_route">New route</option>
            <option value="correction">Correction</option>
            <option value="new_stop">New stop</option>
            <option value="fare_update">Fare update</option>
          </select>
        </label>
        <Field label="Mode" name="mode" select />
        <Field
          label="From"
          name="from"
          placeholder="Starting landmark"
          required
        />
        <Field label="To" name="to" placeholder="Ending landmark" required />
        <Field
          label="Fare (centavos)"
          name="fare"
          type="number"
          placeholder="1500"
          required
        />
      </div>
      <label className="block">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-sm border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          name="notes"
          placeholder="Last verified, operator notes, or a correction detail."
        />
      </label>
      {message ? (
        <p
          className={
            success
              ? "flex items-center gap-2 text-sm text-success"
              : "flex items-center gap-2 text-sm text-destructive"
          }
        >
          {success ? (
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          ) : (
            <AlertCircle aria-hidden="true" className="h-4 w-4" />
          )}
          {message}
        </p>
      ) : null}
      <Button type="submit">Submit for review</Button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
  select = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  select?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {select ? (
        <select
          className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          defaultValue="jeepney"
          name={name}
        >
          <option value="jeepney">Jeepney</option>
          <option value="bus">Bus</option>
          <option value="ferry">Ferry</option>
          <option value="tricycle">Tricycle</option>
          <option value="multicab">Multicab</option>
        </select>
      ) : (
        <input
          className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          name={name}
          placeholder={placeholder}
          required={required}
          type={type}
        />
      )}
    </label>
  );
}

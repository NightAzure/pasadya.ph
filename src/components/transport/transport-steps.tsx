import {
  BusFront,
  Footprints,
  MapPinned,
  ShipWheel,
  TrainFront,
} from "lucide-react";

import type { Journey, Leg } from "@/modules/transport/service";

export function TransportSteps({ journey }: { journey: Journey }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-primary/5 p-3">
        <div>
          <p className="text-sm font-semibold">Estimated journey</p>
          <p className="text-sm text-muted-foreground">
            PHP {(journey.totalFare / 100).toLocaleString("en-PH")} ·{" "}
            {journey.totalDurationMin} min · {Math.round(journey.totalWalkingM)}
            m walking
          </p>
        </div>
        <span className="inline-flex min-h-7 items-center rounded-sm border bg-card px-2 text-xs font-medium text-muted-foreground">
          Approximate
        </span>
      </div>
      <ol className="space-y-2" aria-label="Journey steps">
        {journey.legs.map((leg, index) => (
          <TransportStep
            index={index}
            key={`${leg.mode}-${leg.from.name}-${leg.to.name}`}
            leg={leg}
          />
        ))}
      </ol>
      <p className="text-xs leading-5 text-muted-foreground">
        {journey.disclaimer}
      </p>
    </div>
  );
}

function TransportStep({ index, leg }: { index: number; leg: Leg }) {
  const Icon =
    leg.mode === "walk"
      ? Footprints
      : leg.mode === "ferry"
        ? ShipWheel
        : leg.mode === "bus"
          ? BusFront
          : leg.mode === "jeepney"
            ? TrainFront
            : MapPinned;
  return (
    <li className="flex gap-3 rounded-md border bg-card p-3 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold">
            {index + 1}.{" "}
            {leg.mode === "walk" ? "Walk" : (leg.routeName ?? leg.mode)}
          </p>
          <p className="text-sm font-semibold">
            {leg.fare > 0
              ? `PHP ${(leg.fare / 100).toLocaleString("en-PH")}`
              : "Free"}
          </p>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {leg.instructions}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {leg.from.name} → {leg.to.name} · {leg.durationMin} min
        </p>
      </div>
    </li>
  );
}

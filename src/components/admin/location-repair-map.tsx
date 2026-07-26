"use client";

import { useMemo, useRef, useState } from "react";

type Point = { latitude: number; longitude: number };

const BOUNDS = {
  north: 7.566667,
  south: 6.9,
  west: 125.233333,
  east: 125.791111,
};
const DEFAULT_POINT: Point = { latitude: 7.083, longitude: 125.62 };

function clampPoint(point: Point): Point {
  return {
    latitude: Math.min(BOUNDS.north, Math.max(BOUNDS.south, point.latitude)),
    longitude: Math.min(BOUNDS.east, Math.max(BOUNDS.west, point.longitude)),
  };
}

function formatAddress(address: Record<string, unknown> | null) {
  if (!address) return "";
  const displayName = address.displayName;
  if (typeof displayName === "string" && displayName.trim()) return displayName;
  return [
    address.street,
    address.barangay,
    address.municipality,
    address.province,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && Boolean(part.trim()),
    )
    .join(", ");
}

export function LocationRepairMap({
  initial,
  address,
}: {
  initial: Point | null;
  address: Record<string, unknown> | null;
}) {
  const [point, setPoint] = useState(() =>
    clampPoint(initial ?? DEFAULT_POINT),
  );
  const [resolvedAddress, setResolvedAddress] = useState(() =>
    formatAddress(address),
  );
  const surface = useRef<HTMLDivElement>(null);
  const pin = useMemo(
    () => ({
      left:
        ((point.longitude - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 100,
      top:
        ((BOUNDS.north - point.latitude) / (BOUNDS.north - BOUNDS.south)) * 100,
    }),
    [point],
  );

  function moveFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = surface.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    );
    setPoint({
      latitude: Number(
        (BOUNDS.north - y * (BOUNDS.north - BOUNDS.south)).toFixed(6),
      ),
      longitude: Number(
        (BOUNDS.west + x * (BOUNDS.east - BOUNDS.west)).toFixed(6),
      ),
    });
  }

  function nudge(latitudeDelta: number, longitudeDelta: number) {
    setPoint((current) =>
      clampPoint({
        latitude: Number((current.latitude + latitudeDelta).toFixed(6)),
        longitude: Number((current.longitude + longitudeDelta).toFixed(6)),
      }),
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Place the pin on this provider-neutral launch-area map. It does not
        geocode or load map tiles; use the address and coordinate fields below
        as the accessible fallback when precise map placement is unavailable.
      </p>
      <div
        aria-describedby="location-map-help"
        aria-label="Editable coordinate map for Samal and Davao City"
        className="relative h-56 touch-none overflow-hidden rounded-lg border bg-gradient-to-br from-cyan-50 via-background to-emerald-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={moveFromPointer}
        onPointerMove={(event) => event.buttons === 1 && moveFromPointer(event)}
        ref={surface}
        role="img"
      >
        <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm">
          Samal & Davao City review area
        </span>
        <span
          aria-hidden="true"
          className="absolute -translate-x-1/2 -translate-y-full text-2xl drop-shadow"
          style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
        >
          📍
        </span>
      </div>
      <p className="text-xs text-muted-foreground" id="location-map-help">
        Tap or drag to place the pin. Use the direction controls for a keyboard
        alternative; each move is approximately 55 metres.
      </p>
      <div
        aria-label="Nudge map pin"
        className="grid grid-cols-3 gap-2 self-start"
      >
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(0.0005, 0)}
          type="button"
        >
          North
        </button>
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(0, -0.0005)}
          type="button"
        >
          West
        </button>
        <button
          className="min-h-11 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setPoint(clampPoint(initial ?? DEFAULT_POINT))}
          type="button"
        >
          Reset
        </button>
        <button
          className="min-h-11 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(0, 0.0005)}
          type="button"
        >
          East
        </button>
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(-0.0005, 0)}
          type="button"
        >
          South
        </button>
        <span aria-hidden="true" />
      </div>
      <label className="grid gap-1 text-sm">
        <span>Resolved address fallback</span>
        <input
          className="min-h-11 rounded-md border bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
          name="resolvedAddress"
          onChange={(event) => setResolvedAddress(event.target.value)}
          placeholder="Barangay, municipality, province"
          value={resolvedAddress}
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Latitude fallback</span>
          <input
            className="min-h-11 rounded-md border bg-background px-3 font-mono focus-visible:ring-2 focus-visible:ring-ring"
            name="latitude"
            onChange={(event) =>
              setPoint((current) => ({
                ...current,
                latitude: Number(event.target.value),
              }))
            }
            required
            step="0.000001"
            type="number"
            value={Number.isFinite(point.latitude) ? point.latitude : ""}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Longitude fallback</span>
          <input
            className="min-h-11 rounded-md border bg-background px-3 font-mono focus-visible:ring-2 focus-visible:ring-ring"
            name="longitude"
            onChange={(event) =>
              setPoint((current) => ({
                ...current,
                longitude: Number(event.target.value),
              }))
            }
            required
            step="0.000001"
            type="number"
            value={Number.isFinite(point.longitude) ? point.longitude : ""}
          />
        </label>
      </div>
    </div>
  );
}

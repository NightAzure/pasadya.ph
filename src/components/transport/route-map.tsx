import { MapPin, Route } from "lucide-react";

import type { GeoPoint, TransportRoute } from "@/modules/transport/service";

export function RouteMap({
  routes,
  title = "Route map",
}: {
  routes: TransportRoute[];
  title?: string;
}) {
  const points = routes.flatMap((route) =>
    route.geometry.length > 0 ? route.geometry : route.stops,
  );
  const bounds = getBounds(points);

  return (
    <section
      aria-label={title}
      className="relative min-h-[320px] overflow-hidden rounded-md border bg-[#e7f2ef] shadow-sm"
    >
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-0 top-1/3 h-px w-full bg-white/80" />
        <div className="absolute left-0 top-2/3 h-px w-full bg-white/80" />
        <div className="absolute left-1/3 top-0 h-full w-px bg-white/80" />
        <div className="absolute left-2/3 top-0 h-full w-px bg-white/80" />
        <div className="absolute bottom-0 right-0 h-32 w-40 rounded-tl-full bg-primary/20" />
      </div>
      <div className="absolute left-4 top-4 z-10 rounded-md border bg-card/95 p-3 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Route aria-hidden="true" className="h-4 w-4 text-primary" />
          {title}
        </p>
        <p className="mt-1 max-w-64 text-xs leading-5 text-muted-foreground">
          Approximate route overlays from seeded coordinates. Live map tiles are
          not configured.
        </p>
      </div>
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full p-8"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {routes.map((route) => {
          const line = route.geometry.length > 0 ? route.geometry : route.stops;
          if (line.length < 2) return null;
          return (
            <polyline
              fill="none"
              key={route.id}
              points={line
                .map(
                  (point) =>
                    `${pointPosition(point, bounds).x},${pointPosition(point, bounds).y}`,
                )
                .join(" ")}
              stroke={modeColor(route.mode)}
              strokeDasharray={route.mode === "ferry" ? "2 2" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      {routes.flatMap((route) =>
        route.stops.map((stop) => {
          const position = pointPosition(stop, bounds);
          return (
            <span
              aria-label={`${stop.name} stop`}
              className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-bold text-primary-foreground shadow"
              key={`${route.id}-${stop.id}`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          );
        }),
      )}
      <div className="absolute bottom-4 left-4 right-4 rounded-md border bg-card/95 p-3 shadow-sm">
        <p className="text-sm font-semibold">
          {routes.length} published routes shown
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cyan ferry lines cross the Samal corridor; route data is manually
          seeded for MVP development.
        </p>
      </div>
    </section>
  );
}

function modeColor(mode: TransportRoute["mode"]) {
  return {
    jeepney: "#F59E0B",
    bus: "#3B82F6",
    ferry: "#0891B2",
    tricycle: "#10B981",
    multicab: "#8B5CF6",
    habal_habal: "#EC4899",
  }[mode];
}

function getBounds(points: GeoPoint[]) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return {
    minLat: Math.min(...lats, 7),
    maxLat: Math.max(...lats, 7.12),
    minLng: Math.min(...lngs, 125.5),
    maxLng: Math.max(...lngs, 125.74),
  };
}

function pointPosition(point: GeoPoint, bounds: ReturnType<typeof getBounds>) {
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.01);
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  return {
    x: 8 + ((point.lng - bounds.minLng) / lngRange) * 84,
    y: 92 - ((point.lat - bounds.minLat) / latRange) * 84,
  };
}

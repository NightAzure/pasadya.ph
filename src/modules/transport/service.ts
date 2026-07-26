import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { dispatchEvent } from "@/modules/notifications/service";

import {
  planJourneyFromGraph,
  rebuildListingStopAccess,
  rebuildRouteEdges,
} from "./graph";

export const transportModes = [
  "jeepney",
  "bus",
  "ferry",
  "tricycle",
  "multicab",
  "habal_habal",
] as const;

export type TransportMode = (typeof transportModes)[number];

export type GeoPoint = { lat: number; lng: number };

export type TransportPlace = GeoPoint & {
  id: string;
  label: string;
  kind: "origin" | "destination";
};

export type RouteStop = GeoPoint & {
  id: string;
  name: string;
  stopOrder: number;
  isTerminal: boolean;
};

export type TransportRoute = {
  id: string;
  name: string;
  code: string | null;
  mode: TransportMode;
  description: string | null;
  fareMin: number | null;
  fareMax: number | null;
  operatingHours: Record<string, unknown>;
  source: "official" | "community" | "seeded";
  updatedAt: string;
  geometry: GeoPoint[];
  stops: RouteStop[];
};

export type FerrySchedule = {
  id: string;
  routeName: string;
  origin: string;
  destination: string;
  originPoint: GeoPoint;
  destinationPoint: GeoPoint;
  departureTimes: string[];
  durationMinutes: number;
  fare: number;
  operator: string | null;
  notes: string | null;
  daysOfWeek: number[];
};

export type Leg = {
  mode: TransportMode | "walk";
  routeName?: string;
  from: { name: string; location: GeoPoint };
  to: { name: string; location: GeoPoint };
  fare: number;
  durationMin: number;
  instructions: string;
  distanceM?: number;
};

export type Journey = {
  legs: Leg[];
  totalFare: number;
  totalDurationMin: number;
  totalWalkingM: number;
  disclaimer: string;
};

export const defaultOrigins: TransportPlace[] = [
  {
    id: "davao-city-center",
    label: "Davao City center",
    lat: 7.0731,
    lng: 125.6128,
    kind: "origin",
  },
  {
    id: "matina",
    label: "Matina",
    lat: 7.0581,
    lng: 125.6021,
    kind: "origin",
  },
  {
    id: "lanang",
    label: "Lanang",
    lat: 7.0996,
    lng: 125.6456,
    kind: "origin",
  },
  {
    id: "sasa-wharf",
    label: "Sasa Wharf",
    lat: 7.115,
    lng: 125.667,
    kind: "origin",
  },
  {
    id: "babak-wharf",
    label: "Babak Wharf",
    lat: 7.1157,
    lng: 125.6958,
    kind: "origin",
  },
];

export async function getPublishedRoutes() {
  const [routeResult, stopResult] = await Promise.all([
    db.execute<RouteRow>(sql`
      select
        id::text as "id",
        name,
        code,
        mode,
        description,
        fare_min as "fareMin",
        fare_max as "fareMax",
        operating_hours as "operatingHours",
        source,
        updated_at::text as "updatedAt",
        coalesce(ST_AsGeoJSON(geometry::geometry), '{"type":"LineString","coordinates":[]}'::text) as geometry
      from transport_routes
      where status = 'published'
      order by mode, name
    `),
    db.execute<StopRow>(sql`
      select
        id::text as "id",
        route_id::text as "routeId",
        name,
        stop_order as "stopOrder",
        is_terminal as "isTerminal",
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng
      from route_stops
      order by route_id, stop_order
    `),
  ]);

  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const row of stopResult.rows) {
    const stops = stopsByRoute.get(row.routeId) ?? [];
    stops.push({
      id: row.id,
      name: row.name,
      stopOrder: Number(row.stopOrder),
      isTerminal: row.isTerminal,
      lat: Number(row.lat),
      lng: Number(row.lng),
    });
    stopsByRoute.set(row.routeId, stops);
  }

  return routeResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    mode: row.mode,
    description: row.description,
    fareMin: row.fareMin === null ? null : Number(row.fareMin),
    fareMax: row.fareMax === null ? null : Number(row.fareMax),
    operatingHours: parseJsonObject(row.operatingHours),
    source: row.source,
    updatedAt: row.updatedAt,
    geometry: parseLineString(row.geometry),
    stops: stopsByRoute.get(row.id) ?? [],
  })) satisfies TransportRoute[];
}

export async function getFerrySchedules() {
  const result = await db.execute<FerryRow>(sql`
    select
      id::text as "id",
      route_name as "routeName",
      origin,
      destination,
      ST_Y(origin_location::geometry) as "originLat",
      ST_X(origin_location::geometry) as "originLng",
      ST_Y(dest_location::geometry) as "destinationLat",
      ST_X(dest_location::geometry) as "destinationLng",
      departure_times::text[] as "departureTimes",
      coalesce(duration_minutes, 0) as "durationMinutes",
      coalesce(fare, 0) as fare,
      operator,
      notes,
      days_of_week as "daysOfWeek"
    from ferry_schedules
    order by route_name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    routeName: row.routeName,
    origin: row.origin,
    destination: row.destination,
    originPoint: { lat: Number(row.originLat), lng: Number(row.originLng) },
    destinationPoint: {
      lat: Number(row.destinationLat),
      lng: Number(row.destinationLng),
    },
    departureTimes: (row.departureTimes ?? []).map((time) =>
      String(time).slice(0, 5),
    ),
    durationMinutes: Number(row.durationMinutes),
    fare: Number(row.fare),
    operator: row.operator,
    notes: row.notes,
    daysOfWeek: row.daysOfWeek ?? [],
  })) satisfies FerrySchedule[];
}

export async function getTransportDestinations() {
  const result = await db.execute<DestinationRow>(sql`
    select
      slug as id,
      name as label,
      ST_Y(location::geometry) as lat,
      ST_X(location::geometry) as lng,
      case when address ->> 'municipality' = 'Samal' then 'Samal' else 'Davao City' end as area
    from listings
    where status = 'published' and location is not null
    order by name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    lat: Number(row.lat),
    lng: Number(row.lng),
    kind: "destination" as const,
    area: row.area,
  }));
}

export async function planJourney(input: {
  origin: GeoPoint;
  originLabel: string;
  destination: GeoPoint;
  destinationLabel: string;
}) {
  const summary = await planJourneyFromGraph(input);
  if (!summary?.legs) return null;
  return withDisclaimer(summary.legs, summary);
}

export async function refreshTransportGraph() {
  await rebuildRouteEdges();
  await rebuildListingStopAccess();
}

export async function createRouteContribution(input: {
  userId: string;
  type: "new_route" | "correction" | "new_stop" | "fare_update";
  data: Record<string, unknown>;
}) {
  const result = await db.execute<{ id: string }>(sql`
    insert into route_contributions (user_id, type, data)
    values (${input.userId}, ${input.type}::route_contribution_type, ${JSON.stringify(input.data)}::jsonb)
    returning id::text as id
  `);
  const contributionId = result.rows[0]?.id;
  if (!contributionId) {
    throw new Error("Could not create route contribution");
  }

  await db.execute(sql`
    insert into moderation_queue (type, reference_id, reason)
    values ('route_contribution', ${contributionId}, 'New transport contribution requires review')
  `);

  await dispatchEvent({
    userId: input.userId,
    event: "route_contribution.submitted",
    data: {
      title: "Route contribution submitted",
      body: "Thanks. A moderator will review your transport update.",
      contributionId,
    },
  });

  return contributionId;
}

function withDisclaimer(
  legs: Leg[],
  summary?: { modeled: boolean; confidence: string },
): Journey {
  const modeledNote = summary?.modeled
    ? " Travel times are modeled when explicit schedules or segment timings are unavailable."
    : "";
  const confidenceNote =
    summary?.confidence === "low"
      ? " Route confidence is low until fresh verification exists."
      : "";
  return {
    legs,
    totalFare: legs.reduce((total, leg) => total + leg.fare, 0),
    totalDurationMin: legs.reduce((total, leg) => total + leg.durationMin, 0),
    totalWalkingM: legs.reduce((total, leg) => total + (leg.distanceM ?? 0), 0),
    disclaimer: `Community-sourced and approximate.${modeledNote}${confidenceNote} Check local fares, traffic, weather, and ferry departures before leaving.`,
  };
}

function parseJsonObject(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (value ?? {}) as Record<string, unknown>;
}

function parseLineString(value: unknown): GeoPoint[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const coordinates = (parsed as { coordinates?: unknown[] } | null)
    ?.coordinates;
  if (!Array.isArray(coordinates)) return [];
  return coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return [];
    return [{ lat: Number(coordinate[1]), lng: Number(coordinate[0]) }];
  });
}

type RouteRow = {
  id: string;
  name: string;
  code: string | null;
  mode: TransportMode;
  description: string | null;
  fareMin: number | null;
  fareMax: number | null;
  operatingHours: unknown;
  source: "official" | "community" | "seeded";
  updatedAt: string;
  geometry: unknown;
};

type StopRow = {
  id: string;
  routeId: string;
  name: string;
  stopOrder: number;
  isTerminal: boolean;
  lat: number;
  lng: number;
};

type FerryRow = {
  id: string;
  routeName: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTimes: string[] | null;
  durationMinutes: number;
  fare: number;
  operator: string | null;
  notes: string | null;
  daysOfWeek: number[] | null;
};

type DestinationRow = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  area: string;
};

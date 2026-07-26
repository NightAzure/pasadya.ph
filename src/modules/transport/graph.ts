import { sql } from "drizzle-orm";

import { db } from "@/db/client";

import type { GeoPoint, Leg, TransportMode } from "./service";

type Confidence = "high" | "medium" | "low";
type Source = "official" | "community" | "seeded" | "mixed";

export type RouteSummary = {
  durationMin: number;
  fareMin: number;
  fareMax: number;
  walkingM: number;
  transfers: number;
  modes: Array<TransportMode | "walk">;
  firstMile: string;
  lastMile: string;
  confidence: Confidence;
  lastVerifiedAt: string | null;
  modeled: boolean;
  source: Source;
  legs?: Leg[];
};

type Stop = { id: string; routeId: string; name: string; lat: number; lng: number };
type GraphEdge = {
  from: string;
  to: string;
  durationMin: number;
  fare: number;
  distanceM: number;
  mode: TransportMode | "walk";
  routeName?: string;
  source: Exclude<Source, "mixed">;
  confidence: Confidence;
  lastVerifiedAt: string | null;
  modeled: boolean;
  instructions: string;
};

export async function rebuildRouteEdges() {
  await db.execute(sql`delete from route_edges`);
  await db.execute(sql`
    with ordered_stops as (
      select tr.id as route_id, tr.mode, tr.fare_min, tr.fare_max, tr.operating_hours,
        tr.source, tr.last_verified_at, rs.id as from_stop_id, rs.location as from_location,
        lead(rs.id) over (partition by tr.id order by rs.stop_order) as to_stop_id,
        lead(rs.location) over (partition by tr.id order by rs.stop_order) as to_location
      from transport_routes tr join route_stops rs on rs.route_id = tr.id
      where tr.status = 'published'
    ), directed_edges as (
      select * from ordered_stops where to_stop_id is not null
      union all
      select route_id, mode, fare_min, fare_max, operating_hours, source, last_verified_at,
        to_stop_id, to_location, from_stop_id, from_location
      from ordered_stops where to_stop_id is not null and mode <> 'ferry'
    )
    insert into route_edges (
      route_id, from_stop_id, to_stop_id, distance_m, duration_min, fare, service_hours,
      source, confidence, last_verified_at, modeled
    )
    select route_id, from_stop_id, to_stop_id,
      round(ST_Distance(from_location, to_location))::integer,
      greatest(5, round(ST_Distance(from_location, to_location) / 250.0))::integer,
      coalesce(fare_min, fare_max, 0), operating_hours, source,
      case when source = 'official' then 'high' when source = 'community' then 'medium' else 'low' end,
      last_verified_at, true
    from directed_edges
  `);
}

export async function rebuildListingStopAccess(listingIds?: string[]) {
  const idList = listingIds?.length
    ? sql.join(
        listingIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )
    : null;
  const target = idList ? sql`and l.id in (${idList})` : sql``;
  if (idList) {
    await db.execute(
      sql`delete from listing_stop_access where listing_id in (${idList})`,
    );
  } else {
    await db.execute(sql`delete from listing_stop_access`);
  }
  await db.execute(sql`
    with nearest_stops as (
      select l.id as listing_id, rs.id as stop_id,
        round(ST_Distance(l.location, rs.location))::integer as walking_distance_m,
        row_number() over (partition by l.id order by l.location <-> rs.location) as stop_rank
      from listings l
      cross join lateral (
        select rs.id, rs.location from route_stops rs
        join transport_routes tr on tr.id = rs.route_id and tr.status = 'published'
        where ST_DWithin(l.location, rs.location, 5000)
        order by l.location <-> rs.location limit 3
      ) rs
      where l.status = 'published' and l.location is not null ${target}
    )
    insert into listing_stop_access (
      listing_id, stop_id, walking_distance_m, walking_duration_min, is_primary, updated_at
    )
    select listing_id, stop_id, walking_distance_m,
      greatest(1, round(walking_distance_m / 80.0))::integer, stop_rank = 1, now()
    from nearest_stops
  `);
}

export async function batchRouteSummaries(
  origin: GeoPoint,
  destinations: Array<{ id: string; lat: number; lng: number }>,
  options: { maxWalkingM?: number } = {},
): Promise<Map<string, RouteSummary | null>> {
  const result = new Map<string, RouteSummary | null>(
    destinations.map((destination) => [destination.id, null]),
  );
  if (!destinations.length) return result;

  const maxWalkingM = options.maxWalkingM ?? 5000;
  const listingIds = destinations
    .map((destination) => destination.id)
    .filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    );
  const [edgeResult, stopResult, accessResult, segmentResult, ferryResult] =
    await Promise.all([
      db.execute<EdgeRow>(sql`
        select re.from_stop_id::text as "from", re.to_stop_id::text as "to",
          re.distance_m as "distanceM", re.duration_min as "durationMin", re.fare,
          tr.mode, tr.name as "routeName", re.source, re.confidence,
          re.last_verified_at::text as "lastVerifiedAt", re.modeled
        from route_edges re join transport_routes tr on tr.id = re.route_id
        where tr.status = 'published'
      `),
      db.execute<StopRow>(sql`
        select rs.id::text as id, rs.route_id::text as "routeId", rs.name,
          ST_Y(rs.location::geometry) as lat, ST_X(rs.location::geometry) as lng
        from route_stops rs join transport_routes tr on tr.id = rs.route_id
        where tr.status = 'published'
      `),
      listingIds.length
        ? db.execute<AccessRow>(sql`
            select listing_id::text as "listingId", stop_id::text as "stopId",
              walking_distance_m as "walkingDistanceM", walking_duration_min as "walkingDurationMin"
            from listing_stop_access
            where listing_id in (${sql.join(
              listingIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )})
          `)
        : Promise.resolve({ rows: [] as AccessRow[] }),
      db.execute<SegmentRow>(sql`
        select from_route_id::text as "fromRouteId", to_route_id::text as "toRouteId",
          transfer_stop_id::text as "transferStopId", coalesce(walking_distance_m, 80) as "walkingDistanceM",
          transfer_notes as "transferNotes"
        from route_segments
      `),
      db.execute<FerryRow>(sql`
        select route_name as "routeName", ST_Y(origin_location::geometry) as "originLat",
          ST_X(origin_location::geometry) as "originLng", ST_Y(dest_location::geometry) as "destinationLat",
          ST_X(dest_location::geometry) as "destinationLng", coalesce(duration_minutes, 15) as "durationMin",
          coalesce(fare, 0) as fare, departure_times::text[] as "departureTimes"
        from ferry_schedules
      `),
    ]);

  const stops = new Map(stopResult.rows.map((stop) => [stop.id, stop] as const));
  const graph = new Map<string, GraphEdge[]>();
  const add = (edge: GraphEdge) => {
    const edges = graph.get(edge.from) ?? [];
    edges.push(edge);
    graph.set(edge.from, edges);
  };
  for (const edge of edgeResult.rows) {
    add({
      ...edge,
      distanceM: Number(edge.distanceM),
      durationMin: Number(edge.durationMin),
      fare: Number(edge.fare),
      source: edge.source,
      confidence: edge.confidence,
      modeled: edge.modeled,
      instructions: `Take ${edge.routeName} to the next stop.`,
    });
  }
  addTransferEdges(add, stops, segmentResult.rows);
  addSameStopTransfers(add, [...stops.values()]);
  addFerryEdges(add, stops, ferryResult.rows);

  const originAccess = [...stops.values()]
    .map((stop) => ({ stop, distanceM: Math.round(distanceM(origin, stop)) }))
    .filter((access) => access.distanceM <= maxWalkingM);
  if (!originAccess.length) return result;

  const { distances, paths, starts } = dijkstra(graph, originAccess);
  const accessByListing = new Map<string, AccessRow[]>();
  for (const access of accessResult.rows) {
    const links = accessByListing.get(access.listingId) ?? [];
    links.push(access);
    accessByListing.set(access.listingId, links);
  }

  for (const destination of destinations) {
    const links =
      accessByListing.get(destination.id) ??
      [...stops.values()]
        .map((stop) => ({
          listingId: destination.id,
          stopId: stop.id,
          walkingDistanceM: Math.round(distanceM(destination, stop)),
          walkingDurationMin: Math.max(1, Math.round(distanceM(destination, stop) / 80)),
        }))
        .filter((access) => access.walkingDistanceM <= maxWalkingM)
        .sort((a, b) => a.walkingDistanceM - b.walkingDistanceM)
        .slice(0, 3);
    const candidate = links
      .map((access) => ({
        access,
        duration: distances.get(access.stopId) ?? Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.duration + a.access.walkingDurationMin - (b.duration + b.access.walkingDurationMin))[0];
    if (!candidate || !Number.isFinite(candidate.duration)) continue;
    const path = paths.get(candidate.access.stopId) ?? [];
    if (!path.some((edge) => edge.mode !== "walk")) continue;
    const originLink = originAccess.find(
      (access) => access.stop.id === starts.get(candidate.access.stopId),
    );
    result.set(
      destination.id,
      makeSummary(path, stops, origin, destination, originLink, candidate.access),
    );
  }
  return result;
}

export async function planJourneyFromGraph(input: {
  origin: GeoPoint;
  originLabel: string;
  destination: GeoPoint;
  destinationLabel: string;
}): Promise<RouteSummary | null> {
  const routes = await batchRouteSummaries(input.origin, [
    { id: "__journey__", lat: input.destination.lat, lng: input.destination.lng },
  ]);
  const summary = routes.get("__journey__") ?? null;
  if (!summary?.legs) return summary;
  summary.legs[0] = {
    ...summary.legs[0],
    from: { name: input.originLabel, location: input.origin },
  };
  summary.legs[summary.legs.length - 1] = {
    ...summary.legs[summary.legs.length - 1],
    to: { name: input.destinationLabel, location: input.destination },
  };
  return summary;
}

function dijkstra(graph: Map<string, GraphEdge[]>, originAccess: Array<{ stop: Stop; distanceM: number }>) {
  const distances = new Map<string, number>();
  const paths = new Map<string, GraphEdge[]>();
  const starts = new Map<string, string>();
  const queue: Array<{ node: string; cost: number }> = [];
  for (const access of originAccess) {
    const cost = Math.max(1, Math.round(access.distanceM / 80));
    distances.set(access.stop.id, cost);
    paths.set(access.stop.id, []);
    starts.set(access.stop.id, access.stop.id);
    queue.push({ node: access.stop.id, cost });
  }
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (current.cost !== distances.get(current.node)) continue;
    for (const edge of graph.get(current.node) ?? []) {
      const nextCost = current.cost + edge.durationMin;
      if (nextCost >= (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
      distances.set(edge.to, nextCost);
      paths.set(edge.to, [...(paths.get(current.node) ?? []), edge]);
      starts.set(edge.to, starts.get(current.node)!);
      queue.push({ node: edge.to, cost: nextCost });
    }
  }
  return { distances, paths, starts };
}

function makeSummary(
  path: GraphEdge[],
  stops: Map<string, Stop>,
  origin: GeoPoint,
  destination: GeoPoint,
  originLink: { stop: Stop; distanceM: number } | undefined,
  destinationLink: AccessRow,
): RouteSummary {
  const firstStop = originLink?.stop ?? stops.get(path[0]?.from);
  const lastStop = stops.get(path[path.length - 1]?.to ?? destinationLink.stopId);
  const firstWalk = Math.round(distanceM(origin, firstStop ?? destination));
  const lastWalk = Number(destinationLink.walkingDistanceM);
  let activeRide: string | undefined;
  const pathLegs = path.map((edge) => {
    if (edge.mode === "walk") {
      activeRide = undefined;
      return edgeToLeg(edge, stops);
    }
    const isContinuation = activeRide === edge.routeName;
    activeRide = edge.routeName;
    return edgeToLeg({ ...edge, fare: isContinuation ? 0 : edge.fare }, stops);
  });
  const legs: Leg[] = [
    ...(firstStop && firstWalk > 30
      ? [walkingLeg(origin, firstStop, firstWalk, "Walk to the first stop.")]
      : []),
    ...pathLegs,
    ...(lastStop && lastWalk > 30
      ? [walkingLeg(lastStop, destination, lastWalk, "Walk to your destination.")]
      : []),
  ];
  const rideEdges = path.filter((edge) => edge.mode !== "walk");
  const sources = new Set(rideEdges.map((edge) => edge.source));
  const verified = rideEdges.map((edge) => edge.lastVerifiedAt).filter(Boolean) as string[];
  const stale = verified.some(
    (value) => Date.now() - new Date(value).getTime() > 30 * 24 * 60 * 60 * 1000,
  );
  const modeled = path.some((edge) => edge.modeled);
  const confidence: Confidence =
    modeled || stale || sources.has("seeded")
      ? "low"
      : sources.has("community")
        ? "medium"
        : "high";
  let transfers = 0;
  let lastRide: string | undefined;
  for (const edge of path) {
    if (edge.mode === "walk") continue;
    const rideKey = edge.routeName ?? edge.mode;
    if (lastRide && lastRide !== rideKey) transfers += 1;
    lastRide = rideKey;
  }
  const boardedFare = pathLegs.reduce((total, leg) => total + leg.fare, 0);
  const unconsolidatedFare = rideEdges.reduce((total, edge) => total + edge.fare, 0);
  return {
    durationMin: legs.reduce((total, leg) => total + leg.durationMin, 0),
    fareMin: boardedFare,
    fareMax: Math.max(boardedFare, unconsolidatedFare),
    walkingM: firstWalk + lastWalk + path.filter((edge) => edge.mode === "walk").reduce((total, edge) => total + edge.distanceM, 0),
    transfers,
    modes: [...new Set(legs.map((leg) => leg.mode))],
    firstMile: firstStop ? `${firstWalk}m walk to ${firstStop.name}` : "No stop access",
    lastMile: lastStop ? `${lastWalk}m walk from ${lastStop.name}` : "No stop access",
    confidence,
    lastVerifiedAt: verified.sort().at(-1) ?? null,
    modeled,
    source: sources.size === 1 ? [...sources][0]! : "mixed",
    legs,
  };
}

function addSameStopTransfers(add: (edge: GraphEdge) => void, stops: Stop[]) {
  for (const from of stops) for (const to of stops) {
    if (from.id === to.id || from.routeId === to.routeId) continue;
    const distance = Math.round(distanceM(from, to));
    if (distance > 100) continue;
    add(walkEdge(from, to, distance, "Walk to the connecting stop."));
  }
}

function addTransferEdges(add: (edge: GraphEdge) => void, stops: Map<string, Stop>, segments: SegmentRow[]) {
  for (const segment of segments) {
    const anchor = segment.transferStopId ? stops.get(segment.transferStopId) : undefined;
    if (!anchor) continue;
    const fromStops = [...stops.values()].filter((stop) => stop.routeId === segment.fromRouteId);
    const toStops = [...stops.values()].filter((stop) => stop.routeId === segment.toRouteId);
    const from = nearest(fromStops, anchor);
    const to = nearest(toStops, anchor);
    if (!from || !to) continue;
    add(walkEdge(from, to, Number(segment.walkingDistanceM), segment.transferNotes ?? "Walk to the connecting route."));
    add(walkEdge(to, from, Number(segment.walkingDistanceM), segment.transferNotes ?? "Walk to the connecting route."));
  }
}

function addFerryEdges(add: (edge: GraphEdge) => void, stops: Map<string, Stop>, ferries: FerryRow[]) {
  for (const ferry of ferries) {
    const from = nearest([...stops.values()], { lat: Number(ferry.originLat), lng: Number(ferry.originLng) });
    const to = nearest([...stops.values()], { lat: Number(ferry.destinationLat), lng: Number(ferry.destinationLng) });
    if (!from || !to || distanceM(from, { lat: Number(ferry.originLat), lng: Number(ferry.originLng) }) > 500 || distanceM(to, { lat: Number(ferry.destinationLat), lng: Number(ferry.destinationLng) }) > 500) continue;
    add({ from: from.id, to: to.id, durationMin: Number(ferry.durationMin) + (ferry.departureTimes?.length ? 15 : 30), fare: Number(ferry.fare), distanceM: Math.round(distanceM(from, to)), mode: "ferry", routeName: ferry.routeName, source: "community", confidence: "medium", lastVerifiedAt: null, modeled: true, instructions: `Take the ${ferry.routeName} ferry; confirm the departure time.` });
  }
}

function walkEdge(from: Stop, to: Stop, distance: number, instructions: string): GraphEdge {
  return { from: from.id, to: to.id, durationMin: Math.max(1, Math.round(distance / 80)), fare: 0, distanceM: distance, mode: "walk", source: "community", confidence: "medium", lastVerifiedAt: null, modeled: true, instructions };
}

function edgeToLeg(edge: GraphEdge, stops: Map<string, Stop>): Leg {
  const from = stops.get(edge.from)!;
  const to = stops.get(edge.to)!;
  return { mode: edge.mode, routeName: edge.routeName, from: { name: from.name, location: from }, to: { name: to.name, location: to }, fare: edge.fare, durationMin: edge.durationMin, distanceM: edge.distanceM, instructions: edge.instructions };
}

function walkingLeg(from: GeoPoint | Stop, to: GeoPoint | Stop, distance: number, instructions: string): Leg {
  return { mode: "walk", from: { name: "Origin", location: from }, to: { name: "Destination", location: to }, fare: 0, durationMin: Math.max(1, Math.round(distance / 80)), distanceM: distance, instructions };
}

function nearest<T extends GeoPoint>(items: T[], point: GeoPoint) {
  return items.reduce<T | undefined>((best, item) => !best || distanceM(item, point) < distanceM(best, point) ? item : best, undefined);
}

function distanceM(a: GeoPoint, b: GeoPoint) {
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const latM = (a.lat - b.lat) * 111_000;
  const lngM = (a.lng - b.lng) * 111_000 * Math.cos(lat);
  return Math.sqrt(latM * latM + lngM * lngM);
}

type EdgeRow = Omit<GraphEdge, "instructions">;
type StopRow = Stop;
type AccessRow = { listingId: string; stopId: string; walkingDistanceM: number; walkingDurationMin: number };
type SegmentRow = { fromRouteId: string; toRouteId: string; transferStopId: string | null; walkingDistanceM: number; transferNotes: string | null };
type FerryRow = { routeName: string; originLat: number; originLng: number; destinationLat: number; destinationLng: number; durationMin: number; fare: number; departureTimes: string[] | null };

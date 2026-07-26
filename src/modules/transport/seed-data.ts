import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  rebuildListingStopAccess,
  rebuildRouteEdges,
} from "@/modules/transport/graph";

type SeedStop = { name: string; lat: number; lng: number; terminal?: boolean };
type SeedRoute = {
  code: string;
  name: string;
  mode: "jeepney" | "bus" | "ferry" | "tricycle" | "multicab" | "habal_habal";
  description: string;
  fareMin: number;
  fareMax: number;
  stops: SeedStop[];
};

const coreRoutes: SeedRoute[] = [
  {
    code: "DEV-J01",
    name: "Davao Downtown → Sasa Wharf",
    mode: "jeepney",
    description: "Seeded corridor route for the Davao–Samal ferry connection.",
    fareMin: 1500,
    fareMax: 2000,
    stops: [
      { name: "Davao City Center", lat: 7.0731, lng: 125.6128, terminal: true },
      { name: "Ecoland Terminal", lat: 7.0454, lng: 125.6037 },
      { name: "Sasa Wharf", lat: 7.115, lng: 125.667, terminal: true },
    ],
  },
  {
    code: "DEV-J02",
    name: "Matina → Sasa Wharf",
    mode: "jeepney",
    description:
      "Seeded Matina to port corridor with an Ecoland transfer point.",
    fareMin: 1300,
    fareMax: 2000,
    stops: [
      { name: "Matina", lat: 7.0581, lng: 125.6021, terminal: true },
      { name: "Ecoland Terminal", lat: 7.0454, lng: 125.6037 },
      { name: "Sasa Wharf", lat: 7.115, lng: 125.667, terminal: true },
    ],
  },
  {
    code: "DEV-J03",
    name: "Lanang → Sasa Wharf",
    mode: "jeepney",
    description: "Seeded airport-side route toward Sasa Wharf.",
    fareMin: 1300,
    fareMax: 1800,
    stops: [
      { name: "Lanang", lat: 7.0996, lng: 125.6456, terminal: true },
      { name: "Bajada", lat: 7.0942, lng: 125.625 },
      { name: "Sasa Wharf", lat: 7.115, lng: 125.667, terminal: true },
    ],
  },
  {
    code: "DEV-J04",
    name: "Davao Downtown → Matina",
    mode: "jeepney",
    description:
      "Seeded city route for a same-city journey and transfer example.",
    fareMin: 1300,
    fareMax: 1500,
    stops: [
      { name: "Davao City Center", lat: 7.0731, lng: 125.6128, terminal: true },
      { name: "Ecoland Terminal", lat: 7.0454, lng: 125.6037 },
      { name: "Matina", lat: 7.0581, lng: 125.6021, terminal: true },
    ],
  },
  {
    code: "DEV-J05",
    name: "Davao Downtown → Toril",
    mode: "jeepney",
    description: "Seeded southbound city route.",
    fareMin: 1500,
    fareMax: 2500,
    stops: [
      { name: "Davao City Center", lat: 7.0731, lng: 125.6128, terminal: true },
      { name: "Ecoland Terminal", lat: 7.0454, lng: 125.6037 },
      {
        name: "Toril Public Market",
        lat: 7.0192,
        lng: 125.5017,
        terminal: true,
      },
    ],
  },
  {
    code: "DEV-B01",
    name: "Sasa Wharf → Babak Wharf",
    mode: "ferry",
    description:
      "Seeded ferry corridor; confirm departure and weather conditions locally.",
    fareMin: 8000,
    fareMax: 10000,
    stops: [
      { name: "Sasa Wharf", lat: 7.115, lng: 125.667, terminal: true },
      { name: "Babak Wharf", lat: 7.1157, lng: 125.6958, terminal: true },
    ],
  },
  {
    code: "DEV-T01",
    name: "Babak Wharf → Kaputian",
    mode: "tricycle",
    description: "Seeded Samal island connection toward Kaputian resorts.",
    fareMin: 3000,
    fareMax: 8000,
    stops: [
      { name: "Babak Wharf", lat: 7.1157, lng: 125.6958, terminal: true },
      { name: "Peñaplata Junction", lat: 7.073, lng: 125.705 },
      { name: "Kaputian Port", lat: 6.9705, lng: 125.7308, terminal: true },
    ],
  },
  {
    code: "DEV-M01",
    name: "Babak Wharf → Kaputian Road",
    mode: "multicab",
    description:
      "Seeded island multicab alternative for the Kaputian corridor.",
    fareMin: 2500,
    fareMax: 6000,
    stops: [
      { name: "Babak Wharf", lat: 7.1157, lng: 125.6958, terminal: true },
      { name: "Peñaplata Junction", lat: 7.073, lng: 125.705 },
      { name: "Kaputian Road", lat: 6.9459, lng: 125.7306, terminal: true },
    ],
  },
  {
    code: "DEV-T02",
    name: "Babak Wharf → Talicud Landing",
    mode: "tricycle",
    description: "Seeded island connection for Talicud transfer points.",
    fareMin: 5000,
    fareMax: 12000,
    stops: [
      { name: "Babak Wharf", lat: 7.1157, lng: 125.6958, terminal: true },
      { name: "Peñaplata Junction", lat: 7.073, lng: 125.705 },
      { name: "Talicud Landing", lat: 6.9168, lng: 125.6704, terminal: true },
    ],
  },
  {
    code: "DEV-F01",
    name: "Sta. Ana Wharf → Kaputian",
    mode: "ferry",
    description: "Seeded ferry schedule corridor for the Kaputian landing.",
    fareMin: 12000,
    fareMax: 12000,
    stops: [
      { name: "Sta. Ana Wharf", lat: 7.077, lng: 125.625, terminal: true },
      { name: "Kaputian Port", lat: 6.9705, lng: 125.7308, terminal: true },
    ],
  },
];

const generatedStartPoints: SeedStop[][] = [
  [
    { name: "Davao City Center", lat: 7.0731, lng: 125.6128, terminal: true },
    { name: "Bajada", lat: 7.0942, lng: 125.625, terminal: true },
  ],
  [
    { name: "Ecoland Terminal", lat: 7.0454, lng: 125.6037, terminal: true },
    { name: "Sasa Wharf", lat: 7.115, lng: 125.667, terminal: true },
  ],
  [
    { name: "Toril Public Market", lat: 7.0192, lng: 125.5017, terminal: true },
    { name: "Matina", lat: 7.0581, lng: 125.6021, terminal: true },
  ],
  [
    { name: "Buhangin", lat: 7.105, lng: 125.612, terminal: true },
    { name: "Davao City Center", lat: 7.0731, lng: 125.6128, terminal: true },
  ],
  [
    { name: "Matina", lat: 7.0581, lng: 125.6021, terminal: true },
    { name: "Bajada", lat: 7.0942, lng: 125.625, terminal: true },
  ],
];

const seededRoutes: SeedRoute[] = [
  ...coreRoutes,
  ...Array.from({ length: 20 }, (_, index) => {
    const points = generatedStartPoints[index % generatedStartPoints.length];
    const mode = index % 4 === 0 ? "bus" : "jeepney";
    return {
      code: `DEV-${mode === "bus" ? "B" : "J"}${String(index + 6).padStart(2, "0")}`,
      name: `${points[0].name} → ${points[1].name} (${mode === "bus" ? "bus" : "jeepney"} ${index + 1})`,
      mode,
      description:
        "Development seed corridor; confirm this route with local operators before public launch.",
      fareMin: mode === "bus" ? 1500 : 1300,
      fareMax: mode === "bus" ? 3000 : 2200,
      stops: points,
    } satisfies SeedRoute;
  }),
];

export async function seedTransportData() {
  await db.execute(sql`
    delete from transport_routes where source = 'seeded'
  `);
  await db.execute(sql`
    delete from ferry_schedules where notes like 'Seeded by Project Z.%' or notes like 'Seeded by Pasadya.%'
  `);

  const routeIds = new Map<string, string>();
  for (const route of seededRoutes) {
    const geometry = {
      type: "LineString",
      coordinates: route.stops.map((stop) => [stop.lng, stop.lat]),
    };
    const result = await db.execute<{ id: string }>(sql`
      insert into transport_routes (
        name, code, mode, description, geometry, fare_min, fare_max,
        operating_hours, status, source
      )
      values (
        ${route.name}, ${route.code}, ${route.mode}::transport_mode, ${route.description},
        ST_GeomFromGeoJSON(${JSON.stringify(geometry)})::geography,
        ${route.fareMin}, ${route.fareMax},
        ${JSON.stringify({ start: "05:00", end: "21:00", days: [1, 2, 3, 4, 5, 6, 7] })}::jsonb,
        'published', 'seeded'
      )
      returning id::text as id
    `);
    const routeId = result.rows[0]?.id;
    if (!routeId) throw new Error(`Could not seed ${route.code}`);
    routeIds.set(route.code, routeId);

    for (const [stopOrder, stop] of route.stops.entries()) {
      await db.execute(sql`
        insert into route_stops (route_id, name, location, stop_order, is_terminal)
        values (
          ${routeId}, ${stop.name},
          ST_SetSRID(ST_MakePoint(${stop.lng}, ${stop.lat}), 4326)::geography,
          ${stopOrder + 1}, ${stop.terminal ?? false}
        )
      `);
    }
  }

  await addSegment(
    routeIds,
    "DEV-J04",
    "DEV-J02",
    "Matina",
    "Walk to the Matina jeepney stop.",
    120,
  );
  await addSegment(
    routeIds,
    "DEV-J01",
    "DEV-T01",
    "Sasa Wharf",
    "Walk from the ferry arrival area to the island connection.",
    80,
  );
  await addSegment(
    routeIds,
    "DEV-J01",
    "DEV-T02",
    "Sasa Wharf",
    "Transfer to the Talicud connection at the island side.",
    80,
  );

  const ferrySchedules = [
    [
      "Sasa → Babak",
      "Sasa Wharf",
      "Babak Wharf",
      7.115,
      125.667,
      7.1157,
      125.6958,
      [
        "05:30",
        "06:00",
        "06:30",
        "07:00",
        "07:30",
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
        "18:00",
        "18:30",
        "19:00",
        "19:30",
        "20:00",
        "20:30",
      ],
      10,
      8000,
      "Multiple operators",
      "Schedule is approximate; weather and operator changes can affect departures.",
    ],
    [
      "Sta. Ana → Kaputian",
      "Sta. Ana Wharf",
      "Kaputian Port",
      7.077,
      125.625,
      6.9705,
      125.7308,
      [
        "06:00",
        "06:30",
        "07:00",
        "07:30",
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
      ],
      15,
      12000,
      "Island City Express",
      "Confirm current timetable at the wharf.",
    ],
    [
      "Sasa → Peñaplata",
      "Sasa Wharf",
      "Peñaplata Wharf",
      7.115,
      125.667,
      7.073,
      125.705,
      [
        "06:00",
        "06:30",
        "07:00",
        "07:30",
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
        "18:00",
      ],
      10,
      8000,
      "Multiple operators",
      "Confirm current timetable at the wharf.",
    ],
  ] as const;

  for (const [
    routeName,
    origin,
    destination,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    departureTimes,
    duration,
    fare,
    operator,
    notes,
  ] of ferrySchedules) {
    await db.execute(sql`
      insert into ferry_schedules (
        route_name, origin, destination, origin_location, dest_location,
        departure_times, duration_minutes, fare, operator, notes, days_of_week
      )
      values (
        ${routeName}, ${origin}, ${destination},
        ST_SetSRID(ST_MakePoint(${originLng}, ${originLat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${destinationLng}, ${destinationLat}), 4326)::geography,
        ARRAY[${sql.join(
          departureTimes.map((time) => sql`${time}::time`),
          sql`, `,
        )}], ${duration}, ${fare}, ${operator}, ${`Seeded by Pasadya. ${notes}`}, ARRAY[1,2,3,4,5,6,7]
      )
    `);
  }

  await rebuildRouteEdges();
  await rebuildListingStopAccess();
  return seededRoutes.length;
}

async function addSegment(
  routeIds: Map<string, string>,
  fromCode: string,
  toCode: string,
  transferName: string,
  notes: string,
  walkingDistance: number,
) {
  const fromRouteId = routeIds.get(fromCode);
  const toRouteId = routeIds.get(toCode);
  if (!fromRouteId || !toRouteId) throw new Error("Seed segment route missing");

  const stop = await db.execute<{ id: string }>(sql`
    select id::text as id
    from route_stops
    where route_id in (${fromRouteId}, ${toRouteId}) and name = ${transferName}
    order by route_id = ${fromRouteId} desc
    limit 1
  `);
  const transferStopId = stop.rows[0]?.id;
  await db.execute(sql`
    insert into route_segments (from_route_id, to_route_id, transfer_stop_id, transfer_notes, walking_distance_m)
    values (${fromRouteId}, ${toRouteId}, ${transferStopId ?? null}, ${notes}, ${walkingDistance})
  `);
}

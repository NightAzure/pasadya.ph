import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import {
  createRouteContribution,
  planJourney,
} from "@/modules/transport/service";

async function run() {
  const counts = await db.execute<{
    routes: string;
    stops: string;
    segments: string;
    ferries: string;
  }>(sql`
    select
      (select count(*) from transport_routes where status = 'published')::text as routes,
      (select count(*) from route_stops) ::text as stops,
      (select count(*) from route_segments)::text as segments,
      (select count(*) from ferry_schedules)::text as ferries
  `);
  const row = counts.rows[0];
  if (
    !row ||
    Number(row.routes) < 30 ||
    Number(row.stops) < 60 ||
    Number(row.segments) < 2 ||
    Number(row.ferries) < 3
  ) {
    throw new Error(
      `Phase 06 seed counts are incomplete: ${JSON.stringify(row)}`,
    );
  }

  const planningStartedAt = Date.now();
  const sameRoute = await planJourney({
    origin: { lat: 7.0731, lng: 125.6128 },
    originLabel: "Davao City center",
    destination: { lat: 7.115, lng: 125.667 },
    destinationLabel: "Sasa Wharf",
  });
  if (!sameRoute || sameRoute.legs.length < 1)
    throw new Error("Same-route journey did not resolve");

  const ferryJourney = await planJourney({
    origin: { lat: 7.0731, lng: 125.6128 },
    originLabel: "Davao City center",
    destination: { lat: 6.9459, lng: 125.7306 },
    destinationLabel: "Kaputian Road",
  });
  if (
    !ferryJourney ||
    !ferryJourney.legs.some((leg) => leg.mode === "ferry") ||
    ferryJourney.legs.length < 3
  ) {
    throw new Error("Samal ferry journey did not resolve");
  }

  const noRoute = await planJourney({
    origin: { lat: 7.0192, lng: 125.5017 },
    originLabel: "Toril Public Market",
    destination: { lat: 6.8, lng: 125.9 },
    destinationLabel: "Outside seeded coverage",
  });
  if (noRoute !== null)
    throw new Error("No-route case unexpectedly returned a journey");
  const planningDurationMs = Date.now() - planningStartedAt;
  if (planningDurationMs >= 3000)
    throw new Error(
      `Journey planning exceeded 3 seconds: ${planningDurationMs}ms`,
    );

  const user = await db.execute<{ id: string }>(sql`
    select id::text as id from users where email = 'dev-user@example.test' limit 1
  `);
  const userId = user.rows[0]?.id;
  if (!userId) throw new Error("Development verification user is missing");
  await db.execute(sql`
    delete from moderation_queue where reference_id in (
      select id from route_contributions where data ->> 'routeName' = 'Phase 06 verification fixture'
    )
  `);
  await db.execute(
    sql`delete from route_contributions where data ->> 'routeName' = 'Phase 06 verification fixture'`,
  );
  const contributionId = await createRouteContribution({
    userId,
    type: "correction",
    data: {
      routeName: "Phase 06 verification fixture",
      mode: "jeepney",
      from: "A",
      to: "B",
      fare: 1500,
    },
  });
  const moderation = await db.execute<{ count: string }>(sql`
    select count(*)::text as count from moderation_queue where reference_id = ${contributionId} and type = 'route_contribution' and status = 'pending'
  `);
  if (Number(moderation.rows[0]?.count ?? 0) !== 1)
    throw new Error("Contribution moderation entry was not created");

  console.log("Phase 06 verification passed");
  console.log(
    JSON.stringify({
      counts: row,
      sameRouteLegs: sameRoute.legs.length,
      ferryLegs: ferryJourney.legs.length,
      planningDurationMs,
      contributionId,
    }),
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

import Link from "next/link";
import { ArrowRight, Clock3, ShipWheel, Waypoints } from "lucide-react";

import {
  ContributionForm,
  TransportPlanner,
} from "@/components/transport/transport-planner";
import { RouteMap } from "@/components/transport/route-map";
import { Button } from "@/components/ui/button";
import {
  defaultOrigins,
  getFerrySchedules,
  getPublishedRoutes,
  getTransportDestinations,
  planJourney,
  type FerrySchedule,
  type Journey,
  type TransportRoute,
} from "@/modules/transport/service";

type TransportDestination = Awaited<
  ReturnType<typeof getTransportDestinations>
>[number];

export default async function TransportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  let routes: TransportRoute[] = [];
  let ferries: FerrySchedule[] = [];
  let destinations: TransportDestination[] = [];
  let initialDestination: TransportDestination | undefined;
  let initialJourney: Journey | null = null;

  try {
    [routes, ferries, destinations] = await Promise.all([
      getPublishedRoutes(),
      getFerrySchedules(),
      getTransportDestinations(),
    ]);
    const params = (await searchParams) ?? {};
    const requestedDestination = Array.isArray(params.to)
      ? params.to[0]
      : params.to;
    initialDestination =
      destinations.find(
        (destination) => destination.id === requestedDestination,
      ) ?? destinations[0];
    initialJourney = initialDestination
      ? await planJourney({
          origin: defaultOrigins[0],
          originLabel: defaultOrigins[0].label,
          destination: initialDestination,
          destinationLabel: initialDestination.label,
        })
      : null;
  } catch (error) {
    console.warn(
      "[TransportPage] Database unavailable; rendering empty transport shell.",
      error instanceof Error ? error.message : error,
    );
  }

  return (
    <div className="pb-12">
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-primary">
            Davao City + Samal Island
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            How to get there
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
            Plan a simple public-transport journey, check the ferry corridor,
            and browse the seeded routes behind listing directions.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section aria-labelledby="planner-title" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold" id="planner-title">
              A-to-B planner
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a known Davao or Samal place. Origin search stays
              within the curated MVP place set until geocoding is added.
            </p>
          </div>
          <TransportPlanner
            destinations={destinations}
            initialDestinationId={initialDestination?.id}
            initialJourney={initialJourney}
            origins={defaultOrigins}
          />
        </section>
        <section aria-labelledby="map-title" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold" id="map-title">
              Browse routes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Route lines and stop markers are approximate overlays from the
              development seed set.
            </p>
          </div>
          <RouteMap routes={routes} title="Seeded route browser map" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {routes.slice(0, 30).map((route) => (
              <article
                className="rounded-md border bg-card p-4 shadow-sm"
                key={route.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      {route.mode.replace("_", " ")}
                    </p>
                    <h3 className="mt-1 font-semibold">{route.name}</h3>
                  </div>
                  <Waypoints
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-primary"
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {route.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-sm border px-2 py-1">
                    PHP {((route.fareMin ?? 0) / 100).toLocaleString("en-PH")}–
                    {((route.fareMax ?? 0) / 100).toLocaleString("en-PH")}
                  </span>
                  <span className="rounded-sm border px-2 py-1">
                    {route.stops.length} stops
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section aria-labelledby="ferries-title" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold" id="ferries-title">
              Ferry schedules
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedules are manually seeded and should be confirmed at the
              wharf, especially during bad weather.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {ferries.map((ferry) => (
              <article
                className="rounded-md border bg-card p-4 shadow-sm"
                key={ferry.id}
              >
                <div className="flex items-center gap-2 text-primary">
                  <ShipWheel aria-hidden="true" className="h-5 w-5" />
                  <h3 className="font-semibold">{ferry.routeName}</h3>
                </div>
                <p className="mt-2 text-sm">
                  {ferry.origin}{" "}
                  <ArrowRight
                    aria-hidden="true"
                    className="mx-1 inline h-3.5 w-3.5"
                  />{" "}
                  {ferry.destination}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 aria-hidden="true" className="h-4 w-4" />{" "}
                  {ferry.durationMinutes} min · PHP{" "}
                  {(ferry.fare / 100).toLocaleString("en-PH")}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {ferry.notes}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section
          aria-labelledby="contribute-title"
          className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start"
        >
          <div>
            <h2 className="text-xl font-semibold" id="contribute-title">
              Keep the route data useful
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              If a fare, stop, or corridor is wrong, send a correction.
              Contributions are held for moderation and are never published
              immediately.
            </p>
            <Button asChild className="mt-4" variant="secondary">
              <Link href="#contribute-form">Suggest a correction</Link>
            </Button>
          </div>
          <div id="contribute-form">
            <ContributionForm />
          </div>
        </section>
      </main>
    </div>
  );
}

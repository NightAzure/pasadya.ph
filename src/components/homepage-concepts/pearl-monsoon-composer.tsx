"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BusFront,
  Clock3,
  MapPin,
  Route,
  Ship,
  Star,
  Ticket,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import type { DiscoveryListing } from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

type Area = "samal" | "davao-city";

type JourneyOption =
  | {
      key: string;
      kind: "ferry";
      label: string;
      detail: string;
      ferry: FerrySchedule;
    }
  | {
      key: string;
      kind: "route";
      label: string;
      detail: string;
      route: TransportRoute;
    };

const categoryLabels: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food & drink",
  activity: "Activity",
  service: "Local service",
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function PearlMonsoonComposer({
  listings,
  routes,
  ferries,
}: Pick<ConceptHomeData, "listings" | "routes" | "ferries">) {
  const journeyOptions = useMemo(
    () => buildJourneyOptions(routes, ferries),
    [ferries, routes],
  );
  const [journeyKey, setJourneyKey] = useState(journeyOptions[0]?.key ?? "");
  const [area, setArea] = useState<Area>("samal");
  const [selectedListingId, setSelectedListingId] = useState("");

  const selectedJourney =
    journeyOptions.find((option) => option.key === journeyKey) ??
    journeyOptions[0] ??
    null;

  const areaListings = useMemo(
    () => listings.filter((listing) => getListingArea(listing) === area),
    [area, listings],
  );
  const matchingListings = areaListings.slice(0, 3);
  const selectedListing =
    matchingListings.find((listing) => listing.id === selectedListingId) ??
    matchingListings[0] ??
    null;
  const searchHref = `/search?area=${area}`;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#19324A]/15 bg-[#F4F7FA] shadow-[0_32px_90px_rgba(25,50,74,0.13)] sm:rounded-[2.25rem]">
      <div className="grid border-b border-[#19324A]/15 bg-white lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]">
        <div className="border-b border-[#19324A]/15 p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-9">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#7B5B37]">
            01 · Set the passage
          </p>
          <h3 className="mt-3 text-3xl font-semibold leading-none tracking-[-0.035em] text-[#19324A] [font-family:var(--font-pearl-serif)] sm:text-4xl">
            Begin with the way there.
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#19324A]/70">
            Choose a published connection and the area you want to explore. The
            composer keeps transport notes beside matching places.
          </p>

          <div className="mt-7 grid gap-4">
            <label className="grid gap-2 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[#19324A]/65">
              Origin / connection
              <select
                className="min-h-12 w-full rounded-xl border border-[#19324A]/20 bg-[#F4F7FA] px-4 text-sm font-semibold normal-case tracking-normal text-[#19324A] outline-none transition focus-visible:border-[#C79A62] focus-visible:ring-2 focus-visible:ring-[#C79A62]/45 motion-reduce:transition-none"
                disabled={journeyOptions.length === 0}
                onChange={(event) => setJourneyKey(event.target.value)}
                value={selectedJourney?.key ?? ""}
              >
                {journeyOptions.length > 0 ? (
                  journeyOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label} — {option.detail}
                    </option>
                  ))
                ) : (
                  <option value="">No published connections yet</option>
                )}
              </select>
            </label>

            <fieldset>
              <legend className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[#19324A]/65">
                Destination area
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[#E6EEF2] p-1.5">
                <AreaButton
                  active={area === "samal"}
                  label="Samal Island"
                  onClick={() => {
                    setArea("samal");
                    setSelectedListingId("");
                  }}
                />
                <AreaButton
                  active={area === "davao-city"}
                  label="Davao City"
                  onClick={() => {
                    setArea("davao-city");
                    setSelectedListingId("");
                  }}
                />
              </div>
            </fieldset>
          </div>

          <p className="mt-6 border-l-2 border-[#C79A62] pl-4 text-xs leading-5 text-[#19324A]/62">
            Times, fares, and route details shown here are planning references,
            not live schedules or availability. Confirm with the operator before
            travel.
          </p>
        </div>

        <JourneyCard journey={selectedJourney} />
      </div>

      <div className="grid lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="border-b border-[#19324A]/15 bg-[#E6EEF2] p-4 sm:p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#7B5B37]">
                03 · Match a place
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-none text-[#19324A] [font-family:var(--font-pearl-serif)]">
                {area === "samal" ? "On the island" : "In the city"}
              </h3>
            </div>
            <span
              aria-live="polite"
              className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#19324A]"
            >
              {areaListings.length}{" "}
              {areaListings.length === 1 ? "place" : "places"}
            </span>
          </div>

          {matchingListings.length > 0 ? (
            <div
              aria-label={`Places in ${
                area === "samal" ? "Samal Island" : "Davao City"
              }`}
              className="mt-5 grid gap-2"
            >
              {matchingListings.map((listing, index) => {
                const active = selectedListing?.id === listing.id;

                return (
                  <button
                    aria-pressed={active}
                    className="group grid min-h-[4.75rem] w-full grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-transparent bg-white/70 px-3 py-2.5 text-left outline-none transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E6EEF2] motion-reduce:transform-none motion-reduce:transition-none data-[active=true]:border-[#19324A] data-[active=true]:bg-white data-[active=true]:shadow-[0_12px_28px_rgba(25,50,74,0.09)]"
                    data-active={active}
                    key={listing.id}
                    onClick={() => setSelectedListingId(listing.id)}
                    type="button"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#19324A]/15 text-xs font-bold text-[#7B5B37] group-data-[active=true]:border-[#19324A] group-data-[active=true]:bg-[#19324A] group-data-[active=true]:text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#19324A]">
                        {listing.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[#19324A]/58">
                        {categoryLabels[listing.category]} ·{" "}
                        {formatShortLocation(listing)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-[#19324A]/15 bg-white/70 p-5">
              <p className="text-sm font-bold text-[#19324A]">
                No published places match this area yet.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#19324A]/62">
                Browse the full directory for newly added places and wider
                filters.
              </p>
            </div>
          )}

          <Link
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#19324A]/20 px-4 text-sm font-bold text-[#19324A] outline-none transition hover:border-[#19324A] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#C79A62] motion-reduce:transition-none"
            href={searchHref}
          >
            Browse this area
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <ListingResult area={area} listing={selectedListing} />
      </div>
    </div>
  );
}

function AreaButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className="min-h-11 rounded-lg px-3 text-sm font-bold text-[#19324A]/65 outline-none transition hover:bg-white/65 hover:text-[#19324A] focus-visible:ring-2 focus-visible:ring-[#C79A62] motion-reduce:transition-none data-[active=true]:bg-[#19324A] data-[active=true]:text-white"
      data-active={active}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function JourneyCard({ journey }: { journey: JourneyOption | null }) {
  if (!journey) {
    return (
      <div className="grid min-h-[25rem] place-items-center bg-[#19324A] p-7 text-center text-white">
        <div className="max-w-md">
          <Route
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-[#86B7C9]"
          />
          <h3 className="mt-5 text-3xl font-semibold [font-family:var(--font-pearl-serif)]">
            Published passage notes will appear here.
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/65">
            The complete transport guide is the place to check for newly
            published routes and ferry details.
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F4F7FA] px-5 text-sm font-bold text-[#19324A] outline-none focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#19324A]"
            href="/transport"
          >
            Open transport guide
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const isFerry = journey.kind === "ferry";
  const title = isFerry
    ? `${journey.ferry.origin} → ${journey.ferry.destination}`
    : journey.route.name;
  const points = isFerry
    ? [journey.ferry.origin, journey.ferry.destination]
    : journey.route.stops.slice(0, 4).map((stop) => stop.name);

  return (
    <article
      aria-live="polite"
      className="relative min-h-[25rem] overflow-hidden bg-[#19324A] p-5 text-white sm:p-7 lg:p-9"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[3.5rem] border-[#86B7C9]/10" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#BBD7E0]">
              02 · Published transport note
            </p>
            <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-[0.98] tracking-[-0.025em] [font-family:var(--font-pearl-serif)] sm:text-4xl">
              {title}
            </h3>
            {isFerry ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                {journey.ferry.routeName}
              </p>
            ) : null}
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8 text-[#D7B88D]">
            {isFerry ? (
              <Ship aria-hidden="true" className="h-5 w-5" />
            ) : (
              <BusFront aria-hidden="true" className="h-5 w-5" />
            )}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-white/12 bg-white/[0.055] p-5">
          <div className="flex items-center gap-2" aria-hidden="true">
            {points.length > 0 ? (
              points.map((point, index) => (
                <div
                  className="flex min-w-0 flex-1 items-center gap-2"
                  key={`${point}-${index}`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#D7B88D] bg-[#19324A]" />
                  {index < points.length - 1 ? (
                    <span className="h-px min-w-3 flex-1 bg-[#86B7C9]/55" />
                  ) : null}
                </div>
              ))
            ) : (
              <span className="h-px w-full bg-[#86B7C9]/55" />
            )}
          </div>
          <ol className="mt-3 grid gap-2 text-xs text-white/68 sm:grid-flow-col sm:auto-cols-fr sm:gap-3">
            {points.length > 0 ? (
              points.map((point, index) => (
                <li
                  className="min-w-0 sm:truncate"
                  key={`${point}-label-${index}`}
                >
                  {point}
                </li>
              ))
            ) : (
              <li>See the complete stop list in the transport guide.</li>
            )}
          </ol>
        </div>

        {isFerry ? (
          <FerryFacts ferry={journey.ferry} />
        ) : (
          <RouteFacts route={journey.route} />
        )}

        <div className="mt-auto flex flex-col gap-3 border-t border-white/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-5 text-white/58">
            Guide information only. Confirm the fare, departure, and boarding
            point directly before setting out.
          </p>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C79A62] px-5 text-sm font-bold text-[#19324A] outline-none transition hover:bg-[#D7B88D] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#19324A] motion-reduce:transition-none"
            href="/transport"
          >
            See full route guide
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function FerryFacts({ ferry }: { ferry: FerrySchedule }) {
  return (
    <div className="my-7">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact
          icon={Clock3}
          label="Crossing guide"
          value={
            ferry.durationMinutes > 0
              ? `${ferry.durationMinutes} min`
              : "Confirm locally"
          }
        />
        <Fact
          icon={Ticket}
          label="Guide fare"
          value={formatPrice(ferry.fare)}
        />
        <Fact
          icon={Ship}
          label="Published times"
          value={`${ferry.departureTimes.length} listed`}
        />
      </dl>

      {ferry.departureTimes.length > 0 ? (
        <div className="mt-5">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#BBD7E0]">
            Listed departures
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ferry.departureTimes.slice(0, 4).map((time) => (
              <span
                className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold"
                key={time}
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RouteFacts({ route }: { route: TransportRoute }) {
  return (
    <dl className="my-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Fact icon={BusFront} label="Route mode" value={formatMode(route.mode)} />
      <Fact
        icon={MapPin}
        label="Published stops"
        value={`${route.stops.length} stops`}
      />
      <Fact icon={Ticket} label="Guide fare" value={formatRouteFare(route)} />
    </dl>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3.5">
      <dt className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-[#BBD7E0]">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-2 text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function ListingResult({
  area,
  listing,
}: {
  area: Area;
  listing: DiscoveryListing | null;
}) {
  if (!listing) {
    return (
      <div className="grid min-h-[31rem] place-items-center bg-white px-6 py-14 text-center">
        <div className="max-w-md">
          <MapPin
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-[#C79A62]"
          />
          <h3 className="mt-5 text-3xl font-semibold text-[#19324A] [font-family:var(--font-pearl-serif)]">
            Keep exploring the full directory.
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#19324A]/65">
            More published places may be available through the complete search
            and its wider filters.
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#19324A] px-5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2"
            href={`/search?area=${area}`}
          >
            Search all places
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const image = listing.media[0];

  return (
    <article
      aria-live="polite"
      className="grid min-w-0 bg-white sm:grid-cols-[minmax(15rem,0.92fr)_minmax(0,1.08fr)]"
    >
      <div className="relative min-h-[20rem] overflow-hidden bg-[#19324A] sm:min-h-[31rem]">
        <Image
          alt={
            image?.caption ??
            `${listing.name}, a published place in ${formatAddress(listing)}`
          }
          className="object-cover transition-transform duration-500 motion-reduce:transition-none"
          fill
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
          src={image?.url ?? fallbackListingImage(area)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#19324A]/75 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-[#F4F7FA] px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[#19324A]">
          Matched place
        </span>
        <p className="absolute inset-x-5 bottom-5 flex items-start gap-2 text-xs leading-5 text-white/85">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D7B88D]"
          />
          {formatAddress(listing)}
        </p>
      </div>

      <div className="flex min-w-0 flex-col p-5 sm:p-7 lg:p-8">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#7B5B37]">
          {categoryLabels[listing.category]}
        </p>
        <h3 className="mt-3 text-3xl font-semibold leading-[0.98] tracking-[-0.03em] text-[#19324A] [font-family:var(--font-pearl-serif)] sm:text-4xl">
          {listing.name}
        </h3>
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-[#19324A]/66">
          {listing.description}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-[#19324A]/12 py-5">
          <div>
            <dt className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#19324A]/50">
              Guide price
            </dt>
            <dd className="mt-1 text-sm font-bold text-[#19324A]">
              {formatPrice(listing.priceMin)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#19324A]/50">
              Rating
            </dt>
            <dd className="mt-1 flex items-center gap-1 text-sm font-bold text-[#19324A]">
              {listing.ratingCount > 0 ? (
                <>
                  <Star
                    aria-hidden="true"
                    className="h-4 w-4 fill-[#C79A62] text-[#C79A62]"
                  />
                  {listing.ratingAvg.toFixed(1)}
                  <span className="font-medium text-[#19324A]/52">
                    ({listing.ratingCount})
                  </span>
                </>
              ) : (
                "Not yet rated"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#19324A]/50">
              Booking
            </dt>
            <dd className="mt-1 text-sm font-bold capitalize text-[#19324A]">
              {listing.bookingMode === "none"
                ? "Contact directly"
                : listing.bookingMode}
            </dd>
          </div>
          <div>
            <dt className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#19324A]/50">
              Listing
            </dt>
            <dd className="mt-1 text-sm font-bold text-[#19324A]">
              {listing.dotAccredited ? "DOT accredited" : "Published profile"}
            </dd>
          </div>
        </dl>

        <Link
          className="mt-auto inline-flex min-h-12 items-center justify-between gap-3 rounded-xl bg-[#19324A] px-5 text-sm font-bold text-white outline-none transition hover:bg-[#30221D] focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2 motion-reduce:transition-none"
          href={`/place/${listing.slug}`}
        >
          View place profile
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function buildJourneyOptions(
  routes: TransportRoute[],
  ferries: FerrySchedule[],
): JourneyOption[] {
  const uniqueFerries = Array.from(
    new Map(
      ferries.map((ferry) => [
        `${ferry.routeName}:${ferry.origin}:${ferry.destination}`,
        ferry,
      ]),
    ).values(),
  );
  const ferryOptions: JourneyOption[] = uniqueFerries.map((ferry) => ({
    key: `ferry:${ferry.id}`,
    kind: "ferry",
    label: ferry.origin,
    detail: `${ferry.routeName} · to ${ferry.destination}`,
    ferry,
  }));
  const routeOptions: JourneyOption[] = routes.map((route) => ({
    key: `route:${route.id}`,
    kind: "route",
    label: route.stops[0]?.name ?? route.name,
    detail: `${formatMode(route.mode)} · ${route.name}`,
    route,
  }));

  return [...ferryOptions, ...routeOptions];
}

function getListingArea(listing: DiscoveryListing): Area | null {
  const municipality = listing.address.municipality?.toLowerCase() ?? "";
  const location = [listing.address.barangay, listing.address.municipality]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    municipality.includes("samal") ||
    location.includes("babak") ||
    location.includes("kaputian") ||
    location.includes("peñaplata")
  ) {
    return "samal";
  }
  if (municipality.includes("davao")) return "davao-city";

  return null;
}

function formatAddress(listing: DiscoveryListing) {
  return (
    [
      listing.address.street,
      listing.address.barangay,
      listing.address.municipality,
      listing.address.province,
    ]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function formatShortLocation(listing: DiscoveryListing) {
  return (
    [listing.address.barangay, listing.address.municipality]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function formatMode(mode: TransportRoute["mode"]) {
  return mode
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(price: number | null) {
  return price === null
    ? "Confirm directly"
    : pesoFormatter.format(price / 100);
}

function formatRouteFare(route: TransportRoute) {
  if (route.fareMin === null && route.fareMax === null) {
    return "Confirm locally";
  }
  if (route.fareMin === null) return formatPrice(route.fareMax);
  if (route.fareMax === null || route.fareMin === route.fareMax) {
    return formatPrice(route.fareMin);
  }

  return `${formatPrice(route.fareMin)}–${formatPrice(route.fareMax).replace(
    /^₱/,
    "",
  )}`;
}

function fallbackListingImage(area: Area) {
  return area === "samal"
    ? "/homepage-concepts/shared-photography/samal-dock-desktop.webp"
    : "/homepage-concepts/shared-photography/davao-sunset-desktop.webp";
}

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Bus,
  Clock3,
  Route,
  Ship,
  Ticket,
  UserRound,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { GulfLinesExplorer } from "@/components/homepage-concepts/gulf-lines-explorer";
import {
  ConceptBrand,
  ConceptCategoryLinks,
  ConceptMobileNav,
  ConceptSearchForm,
  formatConceptPrice,
} from "@/components/homepage-concepts/shared";
import type {
  DiscoveryCollection,
  DiscoveryListing,
} from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

type FlexibleConceptData = {
  listings?: DiscoveryListing[];
  featuredListings?: DiscoveryListing[];
  collections?: DiscoveryCollection[];
  routes?: TransportRoute[];
  transportRoutes?: TransportRoute[];
  ferries?: FerrySchedule[];
  ferrySchedules?: FerrySchedule[];
};

const palette = {
  "--gulf-midnight": "#052D35",
  "--gulf-aqua": "#42DECA",
  "--gulf-route": "#3578FF",
  "--gulf-sand": "#F2E9D5",
  "--gulf-sunset": "#FF7858",
} as CSSProperties;

export function GulfLines({ data }: { data: ConceptHomeData }) {
  const normalized = normalizeData(data);
  const claimHref = normalized.listings[0]
    ? `/portal/claims/new?listing=${encodeURIComponent(normalized.listings[0].slug)}`
    : "/search";

  return (
    <div
      className="min-h-screen overflow-x-clip bg-[#052D35] text-[#F2E9D5] selection:bg-[#42DECA] selection:text-[#052D35]"
      style={palette}
    >
      <GulfHeader />

      <main id="main-content">
        <GulfLinesExplorer
          ferries={normalized.ferries.map((ferry) => ({
            id: ferry.id,
            originPoint: ferry.originPoint,
            destinationPoint: ferry.destinationPoint,
          }))}
          listings={normalized.listings}
          routes={normalized.routes.map((route) => ({
            id: route.id,
            name: route.name,
            mode: route.mode,
            geometry: route.geometry,
            stops: route.stops,
          }))}
        >
          <div className="w-full min-w-0 max-w-2xl">
            <div className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-[#42DECA]/35 bg-[#42DECA]/10 px-4 text-[10px] font-bold uppercase tracking-[0.13em] text-[#42DECA] sm:text-xs sm:tracking-[0.2em]">
              <span className="h-2 w-2 rounded-full bg-[#42DECA] shadow-[0_0_14px_#42DECA]" />
              Local intelligence for better days out
            </div>
            <h1
              className="mt-7 text-[clamp(3.25rem,7.8vw,7rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-[#F2E9D5]"
              id="gulf-hero-title"
            >
              Find it.
              <br />
              Book it.
              <br />
              <span className="text-[#42DECA]">Know the way there.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#F2E9D5]/72 sm:text-lg sm:leading-8">
              One clear starting point for stays, food, island days, and the
              routes that connect Davao City + Samal Island.
            </p>

            <div className="mt-9 rounded-[24px] border border-[#F2E9D5]/15 bg-[#031f25]/70 p-3 shadow-[0_24px_80px_rgba(0,0,0,.25)] backdrop-blur-md [&_button]:!min-h-12 [&_button]:!rounded-xl [&_button]:!bg-[#42DECA] [&_button]:!px-5 [&_button]:!font-bold [&_button]:!text-[#052D35] [&_button:hover]:!bg-white [&_form]:!gap-2 [&_input]:!min-h-12 [&_input]:!rounded-xl [&_input]:!border-[#F2E9D5]/20 [&_input]:!bg-[#F2E9D5] [&_input]:!text-[#052D35] [&_input]:placeholder:!text-[#052D35]/55 [&_label]:!text-[#F2E9D5] [&_select]:!min-h-12 [&_select]:!rounded-xl [&_select]:!border-[#F2E9D5]/20 [&_select]:!bg-[#F2E9D5] [&_select]:!text-[#052D35]">
              <ConceptSearchForm
                buttonLabel="Map my day"
                className="!rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
                placeholder="Search a stay, island day, or food stop…"
                variant="gulf"
              />
            </div>

            <div className="mt-6 [&_a]:!min-h-11 [&_a]:!rounded-full [&_a]:!border [&_a]:!border-[#F2E9D5]/20 [&_a]:!bg-transparent [&_a]:!px-4 [&_a]:!text-[#F2E9D5] [&_a:hover]:!border-[#42DECA] [&_a:hover]:!bg-[#42DECA]/10 [&_a:hover]:!text-[#42DECA]">
              <ConceptCategoryLinks variant="gulf" />
            </div>
          </div>
        </GulfLinesExplorer>

        <TransportSignals
          ferries={normalized.ferries}
          routes={normalized.routes}
        />
        <CollectionSignals collections={normalized.collections} />
        <OwnerCallout claimHref={claimHref} />
      </main>

      <GulfFooter claimHref={claimHref} />
      <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:hidden [&_nav]:!border-[#42DECA]/20 [&_nav]:!bg-[#052D35]/95 [&_nav]:!text-[#F2E9D5] [&_a]:!min-h-11 [&_a]:!text-[#F2E9D5]">
        <ConceptMobileNav
          homeHref="/homepage-concepts/gulf-lines"
          variant="gulf"
        />
      </div>
    </div>
  );
}

function GulfHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#42DECA]/15 bg-[#052D35]/90 backdrop-blur-xl">
      <nav
        aria-label="Gulf Lines navigation"
        className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12"
      >
        <div className="[&_a]:!min-h-11 [&_a]:!text-[#F2E9D5] [&_img]:!rounded-xl">
          <ConceptBrand homeHref="/homepage-concepts/gulf-lines" />
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <Link
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-[#F2E9D5]/75 outline-none transition hover:bg-[#F2E9D5]/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#42DECA]"
            href="/search"
          >
            Explore
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-[#F2E9D5]/75 outline-none transition hover:bg-[#F2E9D5]/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#42DECA]"
            href="/transport"
          >
            Route guide
          </Link>
          <Link
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#42DECA]/35 bg-[#42DECA]/10 px-5 text-sm font-semibold text-[#42DECA] outline-none transition hover:bg-[#42DECA] hover:text-[#052D35] focus-visible:ring-2 focus-visible:ring-[#F2E9D5]"
            href="/account"
          >
            <UserRound aria-hidden="true" className="h-4 w-4" />
            My Pasadya
          </Link>
        </div>

        <Link
          aria-label="Open account"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#42DECA]/30 text-[#42DECA] outline-none focus-visible:ring-2 focus-visible:ring-[#F2E9D5] md:hidden"
          href="/account"
        >
          <UserRound aria-hidden="true" className="h-5 w-5" />
        </Link>
      </nav>
    </header>
  );
}

function TransportSignals({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const displayedRoutes = routes
    .filter((route) => route.mode !== "ferry")
    .slice(0, 4);
  const displayedFerries = ferries.slice(0, 2);
  const hasTransport =
    displayedRoutes.length > 0 || displayedFerries.length > 0;

  return (
    <section
      aria-labelledby="gulf-transport-title"
      className="relative overflow-hidden bg-[#052D35] px-5 py-16 text-[#F2E9D5] sm:px-8 sm:py-24"
    >
      <div className="pointer-events-none absolute -right-20 top-10 h-80 w-80 rounded-full border border-[#42DECA]/15" />
      <div className="pointer-events-none absolute -right-8 top-24 h-56 w-56 rounded-full border border-[#42DECA]/15" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#42DECA]">
              From curb to coast
            </p>
            <h2
              className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl"
              id="gulf-transport-title"
            >
              The journey is part of the plan.
            </h2>
          </div>
          <div className="flex flex-col items-start gap-5 lg:items-end">
            <p className="max-w-xl text-sm leading-7 text-[#F2E9D5]/65 lg:text-right">
              Compare published city connections and ferry crossings before you
              leave. Fares and times can change, so confirm locally on travel
              day.
            </p>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#42DECA]/35 px-5 text-sm font-bold text-[#42DECA] outline-none transition hover:bg-[#42DECA] hover:text-[#052D35] focus-visible:ring-2 focus-visible:ring-[#F2E9D5]"
              href="/transport"
            >
              Open the full route guide
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {hasTransport ? (
          <div className="mt-12 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="overflow-hidden rounded-[28px] border border-[#F2E9D5]/15 bg-[#031f25]">
              <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[#F2E9D5]/10 px-6">
                <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.15em]">
                  <Bus aria-hidden="true" className="h-5 w-5 text-[#42DECA]" />
                  City + island routes
                </p>
                <span className="text-xs text-[#F2E9D5]/50">
                  {routes.length} published
                </span>
              </div>
              {displayedRoutes.length > 0 ? (
                <div className="divide-y divide-[#F2E9D5]/10">
                  {displayedRoutes.map((route, index) => (
                    <Link
                      className="group grid min-h-[112px] gap-4 px-6 py-5 outline-none transition hover:bg-[#F2E9D5]/5 focus-visible:bg-[#F2E9D5]/10 sm:grid-cols-[48px_1fr_auto] sm:items-center"
                      href="/transport"
                      key={route.id}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#42DECA]/25 bg-[#42DECA]/10 text-sm font-bold text-[#42DECA]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block font-semibold leading-6">
                          {route.name}
                        </span>
                        <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#F2E9D5]/48">
                          {humanizeMode(route.mode)} · {route.stops.length}{" "}
                          stops
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-4 sm:block sm:text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#F2E9D5]/45">
                          Typical fare
                        </span>
                        <span className="mt-1 block text-sm font-semibold">
                          {formatFareRange(route.fareMin, route.fareMax)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <TransportEmpty message="City route details are being refreshed." />
              )}
            </div>

            <div className="rounded-[28px] bg-[#42DECA] p-6 text-[#052D35] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.15em]">
                  <Ship aria-hidden="true" className="h-5 w-5" />
                  Gulf crossings
                </p>
                <span className="rounded-full border border-[#052D35]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                  Check before leaving
                </span>
              </div>

              {displayedFerries.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {displayedFerries.map((ferry) => (
                    <Link
                      className="group block rounded-[22px] bg-[#052D35] p-5 text-[#F2E9D5] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#052D35] focus-visible:ring-offset-4 focus-visible:ring-offset-[#42DECA]"
                      href="/transport"
                      key={ferry.id}
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span>
                          <span className="block text-lg font-semibold">
                            {ferry.origin}
                            <ArrowRight
                              aria-hidden="true"
                              className="mx-2 inline h-4 w-4 text-[#42DECA]"
                            />
                            {ferry.destination}
                          </span>
                          <span className="mt-2 block text-xs text-[#F2E9D5]/55">
                            {ferry.operator ?? "Local ferry operators"}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                        />
                      </span>
                      <span className="mt-5 grid grid-cols-3 gap-3 border-t border-[#F2E9D5]/12 pt-4 text-xs">
                        <span>
                          <Clock3
                            aria-hidden="true"
                            className="mb-2 h-4 w-4 text-[#42DECA]"
                          />
                          {ferry.departureTimes[0] ?? "Check wharf"}
                        </span>
                        <span>
                          <Route
                            aria-hidden="true"
                            className="mb-2 h-4 w-4 text-[#42DECA]"
                          />
                          {ferry.durationMinutes > 0
                            ? `${ferry.durationMinutes} min`
                            : "Ask locally"}
                        </span>
                        <span>
                          <Ticket
                            aria-hidden="true"
                            className="mb-2 h-4 w-4 text-[#42DECA]"
                          />
                          {formatConceptPrice(ferry.fare || null)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[22px] border border-[#052D35]/20 p-6">
                  <p className="font-semibold">
                    Ferry details are being refreshed.
                  </p>
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#052D35] px-5 text-sm font-bold text-[#F2E9D5] outline-none focus-visible:ring-2 focus-visible:ring-[#052D35] focus-visible:ring-offset-2"
                    href="/transport"
                  >
                    Check transport updates
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-[28px] border border-[#42DECA]/25 bg-[#031f25] p-8 sm:p-12">
            <p className="text-2xl font-semibold">
              Transport details are being refreshed.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#F2E9D5]/65">
              Open the route guide for the newest available travel notes before
              setting out.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#42DECA] px-5 text-sm font-bold text-[#052D35] outline-none focus-visible:ring-2 focus-visible:ring-[#F2E9D5]"
              href="/transport"
            >
              Refresh route guide
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function TransportEmpty({ message }: { message: string }) {
  return (
    <div className="p-6">
      <p className="text-sm text-[#F2E9D5]/65">{message}</p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#42DECA] underline decoration-[#42DECA]/40 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#42DECA]"
        href="/transport"
      >
        Check transport updates
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CollectionSignals({
  collections,
}: {
  collections: DiscoveryCollection[];
}) {
  return (
    <section
      aria-labelledby="gulf-collections-title"
      className="bg-[#F2E9D5] px-5 py-16 text-[#052D35] sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#052D35]/60">
              Local edits
            </p>
            <h2
              className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl"
              id="gulf-collections-title"
            >
              Follow a better line.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#052D35]/68">
            Small, useful guides that connect a mood, a place, and the practical
            details that make the day work.
          </p>
        </div>

        {collections.length > 0 ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {collections.slice(0, 2).map((collection, index) => (
              <Link
                className="group relative grid min-h-[520px] overflow-hidden rounded-[32px] bg-[#052D35] text-[#F2E9D5] outline-none focus-visible:ring-4 focus-visible:ring-[#42DECA] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F2E9D5] sm:min-h-[580px]"
                href={`/collections/${collection.slug}`}
                key={collection.id}
              >
                {collection.coverImage ? (
                  <Image
                    alt=""
                    className="object-cover opacity-75 transition duration-700 group-hover:scale-[1.04]"
                    fill
                    loading="lazy"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    src={collection.coverImage}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 [background-image:radial-gradient(circle_at_72%_28%,rgba(255,120,88,.7),transparent_18%),repeating-radial-gradient(ellipse_at_70%_70%,transparent_0,transparent_32px,rgba(66,222,202,.18)_33px,rgba(66,222,202,.18)_35px)]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#052D35] via-[#052D35]/25 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-10">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full border border-[#F2E9D5]/35 bg-[#052D35]/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] backdrop-blur-md">
                      Guide {String(index + 1).padStart(2, "0")}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-7 w-7 transition-transform group-hover:translate-x-2"
                    />
                  </div>
                  <div>
                    <h3 className="max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                      {collection.title}
                    </h3>
                    <p className="mt-5 max-w-lg text-sm leading-7 text-[#F2E9D5]/75">
                      {publicCollectionDescription(collection.description)}
                    </p>
                    <span className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#42DECA] px-5 text-sm font-bold text-[#052D35]">
                      Open the guide
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[32px] border border-[#052D35]/20 bg-[#F8F1E1] p-8 sm:p-12">
            <p className="text-2xl font-semibold">
              New local guides are on the way.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#052D35]/68">
              Explore all places now while the next pair of routes is being
              assembled.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#052D35] px-5 text-sm font-bold text-[#F2E9D5] outline-none focus-visible:ring-2 focus-visible:ring-[#42DECA] focus-visible:ring-offset-2"
              href="/search"
            >
              Explore all places
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function OwnerCallout({ claimHref }: { claimHref: string }) {
  return (
    <section className="bg-[#FF7858] px-5 py-14 text-[#052D35] sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em]">
            For local owners
          </p>
          <h2 className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl">
            Put your place on the line people already follow.
          </h2>
        </div>
        <Link
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#052D35] px-7 text-sm font-bold text-[#F2E9D5] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#052D35] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FF7858]"
          href={claimHref}
        >
          Claim your listing
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function GulfFooter({ claimHref }: { claimHref: string }) {
  return (
    <footer className="border-t border-[#42DECA]/15 bg-[#031f25] px-5 pb-24 pt-14 text-[#F2E9D5] sm:px-8 md:pb-10 md:pt-20">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-12 border-b border-[#F2E9D5]/12 pb-12 md:grid-cols-[1.3fr_2fr] lg:gap-20">
          <div>
            <div className="[&_a]:!min-h-11 [&_a]:!text-[#F2E9D5] [&_img]:!rounded-xl">
              <ConceptBrand homeHref="/homepage-concepts/gulf-lines" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#F2E9D5]/58">
              Price-aware local discovery and practical transport for Davao City
              + Samal Island.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            <FooterColumn
              links={[
                ["All places", "/search"],
                ["Samal resorts", "/samal/resorts"],
                ["Davao food", "/davao-city/restaurants"],
              ]}
              title="Discover"
            />
            <FooterColumn
              links={[
                ["Route guide", "/transport"],
                ["Activities", "/search?category=activity"],
                ["Services", "/search?category=service"],
              ]}
              title="Plan"
            />
            <FooterColumn
              links={[
                ["My account", "/account"],
                ["Claim a listing", claimHref],
              ]}
              title="Account"
            />
            <FooterColumn
              links={[
                ["Privacy", "/legal/privacy"],
                ["Terms", "/legal/terms"],
                ["Transport notes", "/legal/transport-disclaimer"],
                ["Cancellation", "/legal/cancellation-policy"],
              ]}
              title="Legal"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-7 text-xs text-[#F2E9D5]/45 sm:flex-row sm:items-center sm:justify-between">
          <p>Pasadya · Davao City + Samal Island</p>
          <p className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#42DECA]" />
            Gulf Lines · Homepage preview 03
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <nav aria-label={`${title} footer links`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#42DECA]">
        {title}
      </p>
      <ul className="mt-5 space-y-3">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              className="inline-flex min-h-11 min-w-11 items-center text-sm text-[#F2E9D5]/62 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#42DECA]"
              href={href}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function normalizeData(data: ConceptHomeData) {
  const flexible = data as unknown as FlexibleConceptData;

  return {
    listings: (flexible.listings ?? flexible.featuredListings ?? []).slice(
      0,
      6,
    ),
    collections: (flexible.collections ?? []).slice(0, 2),
    routes: flexible.routes ?? flexible.transportRoutes ?? [],
    ferries: flexible.ferries ?? flexible.ferrySchedules ?? [],
  };
}

function formatFareRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "Ask locally";
  if (min === null) return formatConceptPrice(max);
  if (max === null || min === max) return formatConceptPrice(min);

  return `${formatConceptPrice(min)}–${formatConceptPrice(max).replace(/^₱/, "")}`;
}

function humanizeMode(mode: TransportRoute["mode"]) {
  return mode
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function publicCollectionDescription(description: string) {
  const cleaned = description
    .replace(/\bseed set\b/gi, "collection")
    .replace(/\bseeded\b/gi, "Curated")
    .replace(/\bphase\s+\d+\b/gi, "")
    .replace(/\bmap coordinates?\b/gi, "location details")
    .replace(/\bSEO\b/g, "discovery")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || "A considered route through Davao City + Samal Island.";
}

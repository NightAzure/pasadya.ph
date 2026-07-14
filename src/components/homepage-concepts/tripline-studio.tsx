import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BusFront,
  Clock3,
  Compass,
  Search,
  Ship,
  Sparkles,
  Ticket,
  UserRound,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import {
  ConceptBrand,
  formatConceptPrice,
} from "@/components/homepage-concepts/shared";
import { TriplineExplorer } from "@/components/homepage-concepts/tripline-explorer";
import type {
  DiscoveryCollection,
  DiscoveryListing,
} from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

const TRIPLINE_STYLE = {
  "--tripline-ink": "#111827",
  "--tripline-fog": "#EEF2FF",
  "--tripline-violet": "#6D5DFB",
  "--tripline-mint": "#A7F3D0",
  "--tripline-orange": "#FF7A45",
} as CSSProperties;

const categoryLinks = [
  ["Resorts", "/search?category=resort"],
  ["Rooms", "/search?category=room"],
  ["Food", "/search?category=restaurant"],
  ["Activities", "/search?category=activity"],
  ["Services", "/search?category=service"],
] as const;

export function TriplineStudio({ data }: { data: ConceptHomeData }) {
  const listings = data.listings ?? data.featuredListings ?? [];
  const collections = data.collections ?? [];
  const routes = data.routes ?? [];
  const ferries = data.ferries ?? [];
  const claimHref = listings[0]
    ? `/portal/claims/new?listing=${encodeURIComponent(listings[0].slug)}`
    : "/search";

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white text-[#111827] selection:bg-[#A7F3D0] selection:text-[#111827] [font-family:var(--font-tripline-sans)]"
      style={TRIPLINE_STYLE}
    >
      <TriplineHeader />

      <main id="main-content">
        <DiscoveryWorkbench listings={listings} />
        <TrustLedger listings={listings} />
        <RouteDesk ferries={ferries} routes={routes} />
        <GuideShortcuts collections={collections} />
        <OwnerCallout claimHref={claimHref} />
      </main>

      <TriplineFooter claimHref={claimHref} />
    </div>
  );
}

function TriplineHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#111827]/10 bg-white/92 backdrop-blur-xl">
      <nav
        aria-label="Tripline Studio navigation"
        className="mx-auto flex min-h-[4.5rem] max-w-[92rem] items-center justify-between gap-5 px-4 sm:px-6 lg:px-10"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="[&_a]:!gap-2 [&_a]:!text-[#111827] [&_img]:!rounded-lg">
            <ConceptBrand homeHref="/homepage-concepts/tripline-studio" />
          </div>
          <span
            aria-hidden="true"
            className="hidden h-7 w-px bg-[#111827]/12 sm:block"
          />
          <Link
            className="hidden min-h-11 items-center gap-2 rounded-lg px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#6D5DFB] outline-none hover:bg-[#EEF2FF] focus-visible:ring-2 focus-visible:ring-[#6D5DFB] sm:inline-flex [font-family:var(--font-tripline-mono)]"
            href="/homepage-concepts"
          >
            <span className="h-2 w-2 rounded-full bg-[#FF7A45]" />
            Concept 05 · Studio
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <TopLink href="/search">Explore</TopLink>
          <TopLink href="/transport">Route desk</TopLink>
          <Link
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white outline-none transition hover:bg-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-2 motion-reduce:transition-none"
            href="/account"
          >
            <UserRound aria-hidden="true" className="h-4 w-4" />
            My Pasadya
          </Link>
        </div>

        <Link
          aria-label="Open account"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#111827]/15 bg-[#EEF2FF] text-[#111827] outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB] md:hidden"
          href="/account"
        >
          <UserRound aria-hidden="true" className="h-5 w-5" />
        </Link>
      </nav>
    </header>
  );
}

function TopLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[#4B5563] outline-none transition hover:bg-[#EEF2FF] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#6D5DFB] motion-reduce:transition-none"
      href={href}
    >
      {children}
    </Link>
  );
}

function DiscoveryWorkbench({ listings }: { listings: DiscoveryListing[] }) {
  return (
    <section
      aria-labelledby="tripline-title"
      className="relative overflow-hidden bg-[#EEF2FF] px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16"
    >
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(109,93,251,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(109,93,251,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative mx-auto max-w-[92rem]">
        <div className="grid gap-8 xl:grid-cols-[minmax(19rem,0.48fr)_minmax(0,1.52fr)] xl:items-start">
          <div className="xl:sticky xl:top-28">
            <p className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#6D5DFB]/20 bg-white/70 px-4 text-[0.67rem] font-semibold uppercase tracking-[0.16em] text-[#5446CE] backdrop-blur-sm [font-family:var(--font-tripline-mono)]">
              <span className="h-2 w-2 rounded-full bg-[#A7F3D0] ring-4 ring-[#A7F3D0]/30" />
              Davao City + Samal Island
            </p>
            <h1
              className="mt-6 max-w-xl text-[clamp(3.1rem,6.4vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.07em]"
              id="tripline-title"
            >
              Pick a direction.
              <span className="block text-[#6D5DFB]">We’ll show the line.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#4B5563] sm:text-lg sm:leading-8">
              A clear workspace for finding local stays, food, island days, and
              the transport details that make them reachable.
            </p>

            <figure className="relative mt-8 hidden aspect-[16/9] max-w-xl overflow-hidden rounded-[1.5rem] bg-[#111827] sm:block xl:aspect-[4/3]">
              <ResponsiveHeroArt
                className="object-cover"
                desktopMedia="(min-width: 640px)"
                desktopSizes="(min-width: 1280px) 28vw, 70vw"
                desktopSrc="/homepage-concepts/shared-photography/davao-aerial-desktop.webp"
                mobileSizes="100vw"
                mobileSrc="/homepage-concepts/shared-photography/davao-aerial-mobile.webp"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/75 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white [font-family:var(--font-tripline-mono)]">
                <span>City-to-coast field view</span>
                <span className="rounded-full bg-[#FF7A45] px-3 py-2 text-[#111827]">
                  Local lens
                </span>
              </figcaption>
            </figure>
          </div>

          <div className="min-w-0">
            <QuickSearch />
            <div className="mt-4">
              <TriplineExplorer listings={listings} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickSearch() {
  return (
    <form
      action="/search"
      className="rounded-[1.5rem] border border-[#111827]/12 bg-[#111827] p-3 shadow-[0_24px_70px_rgba(17,24,39,0.16)]"
      method="get"
      role="search"
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(11rem,1.4fr)_minmax(9rem,.8fr)_minmax(9rem,.8fr)_minmax(8rem,.65fr)_auto]">
        <label className="grid gap-1 rounded-xl bg-white px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#6B7280] [font-family:var(--font-tripline-mono)]">
          Search
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6D5DFB]"
            />
            <input
              autoComplete="off"
              className="min-h-11 w-full rounded-md bg-transparent pl-6 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none placeholder:font-normal placeholder:text-[#6B7280] focus-visible:ring-2 focus-visible:ring-[#6D5DFB]"
              name="q"
              placeholder="Beach day, breakfast, airport stay…"
              type="search"
            />
          </span>
        </label>
        <SearchSelect label="Area" name="area">
          <option value="">Everywhere</option>
          <option value="davao-city">Davao City</option>
          <option value="samal">Samal Island</option>
        </SearchSelect>
        <SearchSelect label="Type" name="category">
          <option value="">All places</option>
          <option value="resort">Resorts</option>
          <option value="room">Rooms</option>
          <option value="restaurant">Food</option>
          <option value="activity">Activities</option>
          <option value="service">Services</option>
        </SearchSelect>
        <SearchSelect label="Max price" name="maxPrice">
          <option value="">Any price</option>
          <option value="1000">₱1,000</option>
          <option value="2500">₱2,500</option>
          <option value="5000">₱5,000</option>
        </SearchSelect>
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#A7F3D0] px-5 text-sm font-semibold text-[#111827] outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] motion-reduce:transition-none xl:min-h-full"
          type="submit"
        >
          <Compass aria-hidden="true" className="h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  );
}

function SearchSelect({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 rounded-xl bg-white px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#6B7280] [font-family:var(--font-tripline-mono)]">
      {label}
      <select
        className="min-h-11 min-w-0 rounded-md bg-transparent text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB]"
        defaultValue=""
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function TrustLedger({ listings }: { listings: DiscoveryListing[] }) {
  const pricedCount = listings.filter(
    (listing) => listing.priceMin !== null,
  ).length;
  const reviewedCount = listings.filter(
    (listing) => listing.ratingCount > 0,
  ).length;
  const accreditedCount = listings.filter(
    (listing) => listing.dotAccredited,
  ).length;

  const signals = [
    [
      String(listings.length).padStart(2, "0"),
      "Published picks",
      "In this homepage view",
    ],
    [
      String(pricedCount).padStart(2, "0"),
      "Price signals",
      "Guide amounts visible",
    ],
    [
      String(reviewedCount).padStart(2, "0"),
      "Review trails",
      "Places with ratings",
    ],
    [
      String(accreditedCount).padStart(2, "0"),
      "DOT marks",
      "Accreditation shown",
    ],
  ] as const;

  return (
    <section
      aria-labelledby="trust-ledger-title"
      className="border-y border-[#111827]/10 bg-white px-4 py-12 sm:px-6 lg:px-10 lg:py-16"
    >
      <div className="mx-auto max-w-[92rem]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#5145C7] [font-family:var(--font-tripline-mono)]">
              Trust ledger / current guide
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl"
              id="trust-ledger-title"
            >
              Useful signals, shown upfront.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#4B5563]">
            Prices, ratings, accreditation, and crowd context stay attached to
            the place they describe. Confirm changing details directly before
            setting out.
          </p>
        </div>

        <dl className="mt-9 grid overflow-hidden rounded-[1.5rem] border border-[#111827]/12 sm:grid-cols-2 xl:grid-cols-4">
          {signals.map(([value, label, detail], index) => (
            <div
              className="relative min-h-[10rem] border-[#111827]/10 p-5 sm:p-6 [&:not(:last-child)]:border-b sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(3)]:border-b-0 xl:[&:not(:last-child)]:border-b-0 xl:[&:not(:last-child)]:border-r"
              key={label}
            >
              <span className="absolute right-5 top-5 text-[0.62rem] font-semibold text-[#6B7280] [font-family:var(--font-tripline-mono)]">
                SIGNAL_{String(index + 1).padStart(2, "0")}
              </span>
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block text-4xl font-semibold tracking-[-0.05em] text-[#6D5DFB]">
                  {value}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-5 block text-sm font-semibold text-[#111827]"
                >
                  {label}
                </span>
                <span className="mt-1 block text-xs text-[#6B7280]">
                  {detail}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function RouteDesk({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const displayedRoutes = routes.slice(0, 4);
  const displayedFerries = ferries.slice(0, 2);
  const hasTransport =
    displayedRoutes.length > 0 || displayedFerries.length > 0;

  return (
    <section
      aria-labelledby="route-desk-title"
      className="relative overflow-hidden bg-[#111827] px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-10"
    >
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border-[4rem] border-[#6D5DFB]/15" />
      <div className="relative mx-auto max-w-[92rem]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1.15fr)] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#A7F3D0] [font-family:var(--font-tripline-mono)]">
              Route desk / published connections
            </p>
            <h2
              className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl"
              id="route-desk-title"
            >
              See the fare before you follow the line.
            </h2>
          </div>
          <div className="flex flex-col items-start gap-5 lg:items-end">
            <p className="max-w-xl text-sm leading-7 text-white/62 lg:text-right">
              Compare current guide fares, stops, and ferry times. These are
              practical planning signals—not live availability—so confirm with
              local operators on travel day.
            </p>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white outline-none transition hover:border-[#A7F3D0] hover:bg-[#A7F3D0] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#A7F3D0] motion-reduce:transition-none"
              href="/transport"
            >
              Open complete route guide
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {hasTransport ? (
          <div className="mt-11 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.04]">
              <div className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-5 sm:px-6">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] [font-family:var(--font-tripline-mono)]">
                  <BusFront
                    aria-hidden="true"
                    className="h-4 w-4 text-[#A7F3D0]"
                  />
                  City + island lines
                </p>
                <span className="rounded-full bg-white/8 px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/55 [font-family:var(--font-tripline-mono)]">
                  {routes.length} published
                </span>
              </div>

              {displayedRoutes.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {displayedRoutes.map((route, index) => (
                    <Link
                      className="group grid min-h-[7.25rem] gap-4 px-5 py-5 outline-none transition hover:bg-white/[0.05] focus-visible:bg-[#6D5DFB]/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A7F3D0] motion-reduce:transition-none sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                      href="/transport"
                      key={route.id}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6D5DFB] text-xs font-semibold text-white [font-family:var(--font-tripline-mono)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-6 text-white">
                          {route.name}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/65 [font-family:var(--font-tripline-mono)]">
                          <span>{humanizeMode(route.mode)}</span>
                          <span>{route.stops.length} stops</span>
                          {getOperatingHours(route) ? (
                            <span>{getOperatingHours(route)}</span>
                          ) : null}
                        </span>
                      </span>
                      <span className="flex items-end justify-between gap-3 sm:block sm:min-w-[7rem] sm:text-right">
                        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/65 [font-family:var(--font-tripline-mono)]">
                          Guide fare
                        </span>
                        <span className="mt-1 block font-semibold text-[#A7F3D0]">
                          {formatFareRange(route.fareMin, route.fareMax)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <TransportEmpty message="City and island route details are being refreshed." />
              )}
            </div>

            <div className="rounded-[1.75rem] bg-[#A7F3D0] p-5 text-[#111827] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] [font-family:var(--font-tripline-mono)]">
                    <Ship aria-hidden="true" className="h-4 w-4" />
                    Ferry board
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
                    Schedule details at a glance.
                  </h3>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-[#A7F3D0]">
                  <Ticket aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>

              {displayedFerries.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {displayedFerries.map((ferry) => (
                    <Link
                      className="group block rounded-2xl bg-white/72 p-4 outline-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#111827] motion-reduce:transform-none motion-reduce:transition-none"
                      href="/transport"
                      key={ferry.id}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold leading-6">
                          {ferry.origin} → {ferry.destination}
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                        />
                      </span>
                      <span className="mt-4 grid grid-cols-3 gap-2 border-t border-[#111827]/10 pt-4 text-xs">
                        <span>
                          <Clock3
                            aria-hidden="true"
                            className="mb-2 h-4 w-4 text-[#6D5DFB]"
                          />
                          {ferry.departureTimes[0] ?? "Check wharf"}
                        </span>
                        <span>
                          <Ship
                            aria-hidden="true"
                            className="mb-2 h-4 w-4 text-[#6D5DFB]"
                          />
                          {ferry.durationMinutes > 0
                            ? `${ferry.durationMinutes} min`
                            : "Ask locally"}
                        </span>
                        <span>
                          <Ticket
                            aria-hidden="true"
                            className="mb-2 h-4 w-4 text-[#6D5DFB]"
                          />
                          {formatConceptPrice(ferry.fare || null)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-[#111827]/15 bg-white/45 p-5">
                  <p className="text-sm leading-6">
                    Ferry details are being refreshed. Check the complete guide
                    before traveling.
                  </p>
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2"
                    href="/transport"
                  >
                    Check route updates
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-11 rounded-[1.75rem] border border-white/15 bg-white/[0.04] p-7 sm:p-10">
            <p className="text-2xl font-semibold">
              The route desk is refreshing.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
              Open the complete transport guide for any newly published route
              and ferry details.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#A7F3D0] px-5 text-sm font-semibold text-[#111827] outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/transport"
            >
              Open route guide
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
      <p className="text-sm leading-6 text-white/60">{message}</p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A7F3D0] underline decoration-[#A7F3D0]/40 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#A7F3D0]"
        href="/transport"
      >
        Check route updates
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function GuideShortcuts({
  collections,
}: {
  collections: DiscoveryCollection[];
}) {
  return (
    <section
      aria-labelledby="guide-shortcuts-title"
      className="bg-[#EEF2FF] px-4 py-14 sm:px-6 sm:py-20 lg:px-10"
    >
      <div className="mx-auto max-w-[92rem]">
        <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#5145C7] [font-family:var(--font-tripline-mono)]">
              Guide shortcuts / start with a mood
            </p>
            <h2
              className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl"
              id="guide-shortcuts-title"
            >
              Less browsing. More going.
            </h2>
          </div>
          <nav
            aria-label="Browse place categories"
            className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] lg:justify-end [&::-webkit-scrollbar]:hidden"
          >
            {categoryLinks.map(([label, href]) => (
              <Link
                className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-xl border border-[#111827]/12 bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition hover:-translate-y-0.5 hover:border-[#6D5DFB] hover:text-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB] motion-reduce:transform-none motion-reduce:transition-none"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {collections.length > 0 ? (
          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            {collections.slice(0, 2).map((collection, index) => (
              <Link
                className="group grid min-h-[20rem] overflow-hidden rounded-[1.75rem] bg-white outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-4 focus-visible:ring-offset-[#EEF2FF] motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[minmax(12rem,0.86fr)_minmax(0,1.14fr)]"
                href={`/collections/${collection.slug}`}
                key={collection.id}
              >
                <span className="relative min-h-[14rem] overflow-hidden bg-[#111827] sm:min-h-full">
                  <Image
                    alt=""
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                    fill
                    loading="lazy"
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 40vw, 100vw"
                    src={
                      collection.coverImage ??
                      (index === 0
                        ? "/homepage-concepts/shared-photography/samal-dock-desktop.webp"
                        : "/homepage-concepts/shared-photography/davao-sunset-desktop.webp")
                    }
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[#111827] px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-white [font-family:var(--font-tripline-mono)]">
                    Guide {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="flex flex-col justify-between p-6 sm:p-7">
                  <span>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#A7F3D0] text-[#111827]">
                      <Sparkles aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="mt-5 block text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">
                      {collection.title}
                    </span>
                    <span className="mt-3 line-clamp-3 block text-sm leading-6 text-[#4B5563]">
                      {collection.description}
                    </span>
                  </span>
                  <span className="mt-6 inline-flex min-h-11 items-center justify-between gap-3 border-t border-[#111827]/10 pt-4 text-sm font-semibold text-[#6D5DFB]">
                    Open guide
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-[1.75rem] border border-[#111827]/12 bg-white p-7 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6D5DFB]">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
              Fresh local guides are being assembled.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#4B5563]">
              Explore all current places while the next set of compact routes is
              prepared.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-2"
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
    <section className="bg-[#FF7A45] px-4 py-12 text-[#111827] sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto grid max-w-[92rem] gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] [font-family:var(--font-tripline-mono)]">
            Local owners / your place, clearly presented
          </p>
          <h2 className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
            Keep your listing useful, accurate, and easy to find.
          </h2>
        </div>
        <Link
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#111827] px-7 text-sm font-semibold text-white outline-none transition hover:-translate-y-1 hover:bg-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FF7A45] motion-reduce:transform-none motion-reduce:transition-none"
          href={claimHref}
        >
          Claim your listing
          <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function TriplineFooter({ claimHref }: { claimHref: string }) {
  return (
    <footer className="bg-[#0A0F1C] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto max-w-[92rem]">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[minmax(15rem,1.1fr)_minmax(0,1.9fr)]">
          <div>
            <div className="[&_a]:!text-white [&_img]:!rounded-lg">
              <ConceptBrand homeHref="/homepage-concepts/tripline-studio" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">
              Price-aware local discovery and practical transport for Davao City
              + Samal Island.
            </p>
            <span className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 px-4 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#A7F3D0] [font-family:var(--font-tripline-mono)]">
              <span className="h-2 w-2 rounded-full bg-[#A7F3D0]" />
              Tripline Studio / preview 05
            </span>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
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
        <div className="flex flex-col gap-3 pt-7 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>Pasadya · Davao City + Samal Island</p>
          <Link
            className="inline-flex min-h-11 items-center text-white/55 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#A7F3D0] motion-reduce:transition-none"
            href="/homepage-concepts"
          >
            Compare all homepage concepts
          </Link>
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
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#A7F3D0] [font-family:var(--font-tripline-mono)]">
        {title}
      </p>
      <ul className="mt-4 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              className="inline-flex min-h-11 min-w-11 items-center text-sm text-white/58 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#A7F3D0] motion-reduce:transition-none"
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

function getOperatingHours(route: TransportRoute) {
  const start = route.operatingHours.start;
  const end = route.operatingHours.end;
  return typeof start === "string" && typeof end === "string"
    ? `${start}–${end}`
    : null;
}

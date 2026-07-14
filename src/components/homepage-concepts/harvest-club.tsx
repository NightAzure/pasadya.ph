import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bus,
  Clock3,
  MapPin,
  ShipWheel,
  Star,
  Ticket,
  UserRound,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import {
  ConceptBrand,
  ConceptCategoryLinks,
  ConceptMobileNav,
  ConceptSearchForm,
  formatConceptPrice,
} from "@/components/homepage-concepts/shared";

const HARVEST_STYLE = {
  "--harvest-cream": "#FFF1D2",
  "--harvest-leaf": "#17483A",
  "--harvest-lime": "#C8DA3B",
  "--harvest-cacao": "#613B2D",
  "--harvest-coral": "#F05E48",
} as CSSProperties;

const categoryNames: Record<string, string> = {
  resort: "Resort",
  room: "Room",
  restaurant: "Food",
  activity: "Activity",
  service: "Service",
};

const cardSpans = [
  "lg:col-span-5",
  "lg:col-span-3",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-3",
  "lg:col-span-5",
];

const imageShapes = [
  "aspect-[5/4] lg:aspect-[4/3]",
  "aspect-[4/5] lg:aspect-square",
  "aspect-[5/4] lg:aspect-[5/4]",
  "aspect-[5/4] lg:aspect-[6/5]",
  "aspect-[4/5] lg:aspect-square",
  "aspect-[5/4] lg:aspect-[4/3]",
];

type HarvestClubProps = {
  data: ConceptHomeData;
  fontClassName?: string;
};

export function HarvestClub({ data, fontClassName = "" }: HarvestClubProps) {
  const firstFerry = data.ferries[0];
  const featuredRoutes = data.routes.slice(0, 2);
  const claimHref = data.listings[0]
    ? `/portal/claims/new?listing=${encodeURIComponent(data.listings[0].slug)}`
    : "/search";

  return (
    <div
      className={`${fontClassName} min-h-screen overflow-x-clip bg-[var(--harvest-cream)] pb-20 text-[var(--harvest-leaf)] selection:bg-[var(--harvest-leaf)] selection:text-[var(--harvest-cream)] md:pb-0 [font-family:var(--font-harvest-body)]`}
      style={HARVEST_STYLE}
    >
      <HarvestHeader claimHref={claimHref} />

      <main id="main-content">
        <section
          aria-labelledby="harvest-hero-title"
          className="relative border-b-2 border-[var(--harvest-leaf)]"
        >
          <div className="mx-auto grid max-w-[90rem] lg:min-h-[43rem] lg:grid-cols-12">
            <div className="relative z-10 flex flex-col justify-center px-5 pb-9 pt-14 sm:px-8 lg:col-span-7 lg:px-12 lg:py-20 xl:px-16">
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <span className="inline-flex min-h-11 items-center border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)] px-4 text-xs font-bold uppercase tracking-[0.18em] shadow-[4px_4px_0_#17483A]">
                  Davao City + Samal Island
                </span>
                <span className="text-sm font-semibold">
                  Make room for fun.
                </span>
              </div>

              <h1
                className="max-w-4xl text-[clamp(3.5rem,8vw,8.5rem)] font-semibold leading-[0.79] tracking-[-0.065em] [font-family:var(--font-harvest-display)]"
                id="harvest-hero-title"
              >
                <span className="block italic">Laag Ta.</span>
                <span className="mt-4 block text-[0.54em] leading-[0.94] tracking-[-0.045em] sm:mt-6">
                  Make a Day of Davao &amp; Samal.
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-base font-medium leading-7 text-[var(--harvest-cacao)] sm:text-lg sm:leading-8">
                Sea air, city tables, slow mornings, and one more stop before
                home. Find places for the kind of day you actually want.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 underline decoration-2 underline-offset-8 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-leaf)] focus-visible:ring-offset-2"
                  href="/samal/resorts"
                >
                  Sleep by the sea{" "}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center gap-2 underline decoration-2 underline-offset-8 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-leaf)] focus-visible:ring-offset-2"
                  href="/davao-city/restaurants"
                >
                  Eat around Davao{" "}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[28rem] border-t-2 border-[var(--harvest-leaf)] lg:col-span-5 lg:min-h-full lg:border-l-2 lg:border-t-0">
              <ResponsiveHeroArt
                desktopMedia="(min-width: 640px)"
                desktopSizes="(min-width: 1024px) 42vw, 100vw"
                desktopSrc="/homepage-concepts/harvest-club/hero-desktop.webp"
                mobileSrc="/homepage-concepts/harvest-club/hero-mobile.webp"
              />
              <div
                aria-hidden="true"
                className="absolute -left-10 top-[14%] hidden h-28 w-28 rotate-12 border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-coral)] lg:block"
              />
              <div className="absolute bottom-0 left-0 max-w-[17rem] border-r-2 border-t-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)] p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Weekend note
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none [font-family:var(--font-harvest-display)]">
                  Bring an appetite. Leave space for a swim.
                </p>
              </div>
              <div
                aria-hidden="true"
                className="absolute right-5 top-5 h-16 w-16 rounded-full border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-cream)] sm:h-20 sm:w-20"
              />
            </div>
          </div>
        </section>

        <section
          aria-label="Search Pasadya"
          className="border-b-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)]"
        >
          <div className="mx-auto max-w-[90rem] px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em]">
                What sounds good?
              </p>
              <p className="hidden text-sm font-semibold text-[var(--harvest-cacao)] sm:block">
                Search every area by default
              </p>
            </div>
            <div className="harvest-search">
              <ConceptSearchForm
                buttonLabel="Find a good day"
                className="rounded-none border-2 p-3 shadow-[8px_8px_0_#17483A] [&_button]:rounded-none [&_input]:rounded-none [&_input]:placeholder:text-[#613B2D] [&_select]:rounded-none"
                placeholder="Try “beach day,” “airport stay,” or “seafood”…"
                variant="harvest"
              />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="harvest-moods-title"
          className="border-b-2 border-[var(--harvest-leaf)]"
        >
          <div className="mx-auto max-w-[90rem] px-5 py-10 sm:px-8 lg:px-12 lg:py-14 xl:px-16">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--harvest-cacao)]">
                  Pick your mood
                </p>
                <h2
                  className="mt-3 text-4xl font-semibold leading-[0.94] tracking-[-0.035em] sm:text-5xl [font-family:var(--font-harvest-display)]"
                  id="harvest-moods-title"
                >
                  Five ways to make a good day.
                </h2>
              </div>
              <div className="harvest-categories">
                <ConceptCategoryLinks
                  linkClassName="rounded-none border-2 px-5"
                  variant="harvest"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="harvest-weekend-title"
          className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 lg:px-12 lg:py-24 xl:px-16"
        >
          <div className="flex flex-col gap-6 border-b-2 border-[var(--harvest-leaf)] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--harvest-cacao)]">
                The weekend shelf
              </p>
              <h2
                className="mt-2 text-5xl font-semibold leading-none tracking-[-0.045em] sm:text-6xl [font-family:var(--font-harvest-display)]"
                id="harvest-weekend-title"
              >
                Worth getting out for.
              </h2>
            </div>
            <Link
              className="inline-flex min-h-12 w-fit items-center gap-3 border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-leaf)] px-5 text-sm font-bold text-[var(--harvest-cream)] shadow-[5px_5px_0_#C8DA3B] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-coral)] focus-visible:ring-offset-2"
              href="/search"
            >
              Browse every place{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {data.listings.length > 0 ? (
            <div className="-mx-5 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-7 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-12 lg:items-start lg:overflow-visible lg:px-0">
              {data.listings.map((listing, index) => (
                <article
                  className={`min-w-[82vw] snap-start sm:min-w-[22rem] lg:min-w-0 ${cardSpans[index] ?? "lg:col-span-4"}`}
                  key={listing.id}
                >
                  <Link
                    className="group block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-leaf)] focus-visible:ring-offset-4"
                    href={`/place/${listing.slug}`}
                  >
                    <div
                      className={`relative overflow-hidden border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-cacao)] ${imageShapes[index] ?? "aspect-[5/4]"}`}
                    >
                      {listing.media[0]?.url ? (
                        <Image
                          alt={listing.name}
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                          fill
                          sizes="(min-width: 1024px) 40vw, (min-width: 640px) 352px, 82vw"
                          src={listing.media[0].url}
                        />
                      ) : (
                        <ListingImageFallback name={listing.name} />
                      )}
                      <span className="absolute left-3 top-3 border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[var(--harvest-leaf)]">
                        {categoryNames[listing.category] ?? listing.category}
                      </span>
                      {listing.bookingMode === "instant" ? (
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-[var(--harvest-leaf)] px-3 py-2 text-xs font-bold text-[var(--harvest-cream)]">
                          <Ticket aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                          Instant
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-start justify-between gap-5 border-x-2 border-b-2 border-[var(--harvest-leaf)] bg-[var(--harvest-cream)] p-5 transition-colors group-hover:bg-white">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-semibold leading-tight tracking-[-0.025em] [font-family:var(--font-harvest-display)]">
                          {listing.name}
                        </h3>
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--harvest-cacao)]">
                          <MapPin
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="truncate">
                            {listingLocation(listing)}
                          </span>
                        </p>
                        <p className="mt-4 text-sm font-bold uppercase tracking-[0.1em]">
                          {formatConceptPrice(listing.priceMin)}
                        </p>
                      </div>
                      {listing.ratingCount > 0 ? (
                        <span className="inline-flex shrink-0 items-center gap-1 border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)] px-2 py-1 text-xs font-bold">
                          <Star
                            aria-hidden="true"
                            className="h-3 w-3 fill-current"
                          />
                          {Number(listing.ratingAvg).toFixed(1)}
                        </span>
                      ) : (
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0"
                        />
                      )}
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-9 border-2 border-dashed border-[var(--harvest-leaf)] bg-white/40 p-7 sm:p-10">
              <h3 className="text-3xl font-semibold [font-family:var(--font-harvest-display)]">
                Start with the feeling, not the place.
              </h3>
              <p className="mt-2 max-w-2xl leading-7 text-[var(--harvest-cacao)]">
                New recommendations are on the way. Browse a category to find
                the day that fits right now.
              </p>
              <div className="harvest-categories mt-6">
                <ConceptCategoryLinks
                  linkClassName="rounded-none border-2 px-5"
                  variant="harvest"
                />
              </div>
            </div>
          )}
        </section>

        <section
          aria-labelledby="harvest-transport-title"
          className="relative overflow-hidden border-y-2 border-[var(--harvest-leaf)] bg-[var(--harvest-leaf)] text-[var(--harvest-cream)]"
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[42px] border-[var(--harvest-coral)] opacity-90"
          />
          <div className="relative mx-auto grid max-w-[90rem] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-24 xl:px-16">
            <div className="lg:col-span-5">
              <span className="inline-flex min-h-11 items-center bg-[var(--harvest-lime)] px-4 text-xs font-bold uppercase tracking-[0.18em] text-[var(--harvest-leaf)]">
                The crossing is part of it
              </span>
              <h2
                className="mt-7 max-w-xl text-5xl font-semibold leading-[0.9] tracking-[-0.05em] sm:text-7xl [font-family:var(--font-harvest-display)]"
                id="harvest-transport-title"
              >
                Cross the gulf. Keep the day easy.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#FFF1D2]/80 sm:text-lg sm:leading-8">
                Check ferry departures and useful city routes before you leave.
                Times and fares can change, so confirm details on travel day.
              </p>
              <Link
                className="mt-8 inline-flex min-h-12 items-center gap-3 border-2 border-[var(--harvest-cream)] px-5 text-sm font-bold transition-colors hover:bg-[var(--harvest-cream)] hover:text-[var(--harvest-leaf)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--harvest-leaf)]"
                href="/transport"
              >
                Plan how to get there{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 lg:col-span-7 lg:grid-cols-2 lg:items-start">
              {firstFerry ? (
                <article className="border-2 border-[var(--harvest-cream)] bg-[var(--harvest-cream)] p-6 text-[var(--harvest-leaf)] shadow-[8px_8px_0_#C8DA3B] sm:p-8 lg:translate-y-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--harvest-cacao)]">
                        Ferry board
                      </p>
                      <h3 className="mt-3 text-3xl font-semibold leading-none [font-family:var(--font-harvest-display)]">
                        {firstFerry.routeName}
                      </h3>
                    </div>
                    <ShipWheel
                      aria-hidden="true"
                      className="h-8 w-8 shrink-0"
                    />
                  </div>
                  <p className="mt-6 text-lg font-bold">
                    {firstFerry.origin} <span aria-hidden="true">→</span>{" "}
                    {firstFerry.destination}
                  </p>
                  <dl className="mt-6 grid grid-cols-2 gap-4 border-t-2 border-[var(--harvest-leaf)] pt-5">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.12em]">
                        Crossing
                      </dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {firstFerry.durationMinutes} min
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.12em]">
                        Fare from
                      </dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {formatPeso(firstFerry.fare)}
                      </dd>
                    </div>
                  </dl>
                  <div
                    className="mt-5 flex flex-wrap gap-2"
                    aria-label="Selected departure times"
                  >
                    {firstFerry.departureTimes.length > 0 ? (
                      firstFerry.departureTimes.slice(0, 4).map((time) => (
                        <span
                          className="border border-[var(--harvest-leaf)] px-2.5 py-1.5 text-xs font-bold"
                          key={time}
                        >
                          {time}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-semibold">
                        Check today&apos;s schedule
                      </span>
                    )}
                  </div>
                </article>
              ) : (
                <TransportEmptyState label="Ferry details are being refreshed." />
              )}

              <div className="space-y-5">
                {featuredRoutes.length > 0 ? (
                  featuredRoutes.map((route) => (
                    <article
                      className="border-2 border-[var(--harvest-cream)] p-5 sm:p-6"
                      key={route.id}
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[var(--harvest-lime)] text-[var(--harvest-leaf)]">
                          <Bus aria-hidden="true" className="h-6 w-6" />
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--harvest-lime)]">
                            {route.mode.replaceAll("_", " ")}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold leading-tight">
                            {route.name}
                          </h3>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#FFF1D2]/35 pt-4 text-sm font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <MapPin aria-hidden="true" className="h-4 w-4" />
                          {route.stops.length} stops
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Ticket aria-hidden="true" className="h-4 w-4" />
                          {routeFare(route.fareMin, route.fareMax)}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <TransportEmptyState label="City route details are being refreshed." />
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="harvest-guides-title"
          className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 lg:px-12 lg:py-24 xl:px-16"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--harvest-cacao)]">
              Save this for later
            </p>
            <h2
              className="mt-3 text-5xl font-semibold leading-[0.92] tracking-[-0.045em] sm:text-7xl [font-family:var(--font-harvest-display)]"
              id="harvest-guides-title"
            >
              A whole day, already taking shape.
            </h2>
          </div>

          {data.collections.length > 0 ? (
            <div className="mt-10 grid gap-7 lg:grid-cols-2">
              {data.collections.map((collection, index) => (
                <Link
                  className={`group relative grid min-h-[31rem] overflow-hidden border-2 border-[var(--harvest-leaf)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-leaf)] focus-visible:ring-offset-4 sm:grid-cols-[0.9fr_1.1fr] ${index % 2 === 0 ? "bg-[var(--harvest-lime)]" : "bg-white"}`}
                  href={`/collections/${collection.slug}`}
                  key={collection.id}
                >
                  <div className="relative min-h-64 overflow-hidden border-b-2 border-[var(--harvest-leaf)] sm:min-h-full sm:border-b-0 sm:border-r-2">
                    {collection.coverImage ? (
                      <Image
                        alt=""
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 100vw"
                        src={collection.coverImage}
                      />
                    ) : (
                      <CollectionImageFallback index={index} />
                    )}
                  </div>
                  <div className="relative flex flex-col justify-between p-6 sm:p-8">
                    <div
                      aria-hidden="true"
                      className="absolute -right-7 -top-7 h-24 w-24 rotate-12 bg-[var(--harvest-coral)]"
                    />
                    <div className="relative">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--harvest-cacao)]">
                        Guide {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-5 text-4xl font-semibold leading-[0.93] tracking-[-0.035em] sm:text-5xl [font-family:var(--font-harvest-display)]">
                        {collection.title}
                      </h3>
                      <p className="mt-5 line-clamp-4 leading-7 text-[var(--harvest-cacao)]">
                        {collection.description}
                      </p>
                    </div>
                    <span className="relative mt-10 inline-flex min-h-11 items-center gap-2 font-bold underline decoration-2 underline-offset-8">
                      Open the guide{" "}
                      <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-10 border-2 border-dashed border-[var(--harvest-leaf)] p-8 text-[var(--harvest-cacao)]">
              Fresh trip guides are being prepared. In the meantime, browse
              places by category and build your own good day.
            </div>
          )}
        </section>

        <section className="border-y-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)]">
          <div className="relative mx-auto grid max-w-[90rem] overflow-hidden px-5 py-14 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-20 xl:px-16">
            <div className="relative z-10 lg:col-span-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--harvest-cacao)]">
                For local owners
              </p>
              <h2 className="mt-3 max-w-4xl text-5xl font-semibold leading-[0.9] tracking-[-0.05em] sm:text-7xl [font-family:var(--font-harvest-display)]">
                Your place belongs in the plan.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[var(--harvest-cacao)] sm:text-lg">
                Claim your listing to keep details current, welcome questions,
                and help guests know what to expect before they arrive.
              </p>
            </div>
            <div className="relative z-10 mt-8 flex items-end lg:col-span-4 lg:mt-0 lg:justify-end">
              <Link
                className="inline-flex min-h-14 items-center gap-3 border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-leaf)] px-6 font-bold text-[var(--harvest-cream)] shadow-[7px_7px_0_#F05E48] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-coral)] focus-visible:ring-offset-2"
                href={claimHref}
              >
                Claim your listing{" "}
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-24 right-[22%] h-60 w-60 rounded-full bg-[var(--harvest-coral)]"
            />
          </div>
        </section>
      </main>

      <HarvestFooter claimHref={claimHref} />
      <ConceptMobileNav
        homeHref="/homepage-concepts/harvest-club"
        variant="harvest"
      />
    </div>
  );
}

function HarvestHeader({ claimHref }: { claimHref: string }) {
  return (
    <header className="relative z-40 border-b-2 border-[var(--harvest-leaf)] bg-[var(--harvest-cream)]">
      <nav
        aria-label="Harvest Club navigation"
        className="mx-auto flex min-h-[4.75rem] max-w-[90rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12 xl:px-16"
      >
        <div className="harvest-brand">
          <ConceptBrand
            homeHref="/homepage-concepts/harvest-club"
            markClassName="rounded-none ring-2 ring-[var(--harvest-leaf)]"
            wordClassName="text-xl font-extrabold tracking-[-0.03em]"
          />
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <Link className={headerLinkClass} href="/search">
            Discover
          </Link>
          <Link className={headerLinkClass} href="/transport">
            Get around
          </Link>
          <Link className={headerLinkClass} href={claimHref}>
            For owners
          </Link>
        </div>
        <Link
          aria-label="Open account"
          className="flex h-11 w-11 items-center justify-center border-2 border-[var(--harvest-leaf)] bg-[var(--harvest-lime)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-leaf)] focus-visible:ring-offset-2"
          href="/account"
        >
          <UserRound aria-hidden="true" className="h-5 w-5" />
        </Link>
      </nav>
    </header>
  );
}

const headerLinkClass =
  "inline-flex min-h-11 items-center px-4 text-sm font-bold underline-offset-8 transition-colors hover:bg-[var(--harvest-lime)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--harvest-leaf)] focus-visible:ring-offset-2";

function HarvestFooter({ claimHref }: { claimHref: string }) {
  return (
    <footer className="bg-[var(--harvest-leaf)] text-[var(--harvest-cream)]">
      <div className="mx-auto max-w-[90rem] px-5 py-14 sm:px-8 lg:px-12 lg:py-20 xl:px-16">
        <div className="grid gap-12 border-b border-[#FFF1D2]/30 pb-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="harvest-brand harvest-brand-dark w-fit">
              <ConceptBrand
                homeHref="/homepage-concepts/harvest-club"
                markClassName="rounded-none bg-[var(--harvest-cream)] ring-2 ring-[var(--harvest-cream)]"
                wordClassName="text-xl font-extrabold tracking-[-0.03em]"
              />
            </div>
            <p className="mt-6 max-w-md text-lg leading-8 text-[#FFF1D2]/75">
              Find, compare, and reach memorable local places across Davao City
              + Samal Island.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterGroup
              label="Discover"
              links={[
                ["Resorts", "/samal/resorts"],
                ["Food", "/davao-city/restaurants"],
                ["All places", "/search"],
              ]}
            />
            <FooterGroup
              label="Plan"
              links={[
                ["Transport", "/transport"],
                ["My account", "/account"],
                ["Claim a listing", claimHref],
              ]}
            />
            <FooterGroup
              label="Know"
              links={[
                ["Privacy", "/legal/privacy"],
                ["Terms", "/legal/terms"],
                ["Cancellation", "/legal/cancellation-policy"],
                ["Transport notice", "/legal/transport-disclaimer"],
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-7 text-sm text-[#FFF1D2]/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Pasadya. Good days, made local.</p>
          <p>Davao City + Samal Island</p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  label,
  links,
}: {
  label: string;
  links: Array<[label: string, href: string]>;
}) {
  return (
    <nav aria-label={`${label} links`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--harvest-lime)]">
        {label}
      </p>
      <ul className="mt-4 space-y-1">
        {links.map(([linkLabel, href]) => (
          <li key={href}>
            <Link
              className="inline-flex min-h-11 min-w-11 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--harvest-lime)]"
              href={href}
            >
              {linkLabel}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ListingImageFallback({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--harvest-cacao)] text-[var(--harvest-cream)]">
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--harvest-coral)]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -left-6 h-32 w-32 rotate-12 bg-[var(--harvest-lime)]"
      />
      <p className="absolute bottom-6 left-6 right-6 text-3xl font-semibold leading-none [font-family:var(--font-harvest-display)]">
        {name}
      </p>
    </div>
  );
}

function CollectionImageFallback({ index }: { index: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--harvest-leaf)]">
      <div className="absolute left-[12%] top-[14%] h-[58%] w-[58%] rounded-full bg-[var(--harvest-coral)]" />
      <div
        className={`absolute bottom-[8%] right-[8%] h-[43%] w-[43%] border-4 border-[var(--harvest-cream)] ${index % 2 === 0 ? "rotate-12 bg-[var(--harvest-lime)]" : "-rotate-12 bg-[var(--harvest-cacao)]"}`}
      />
    </div>
  );
}

function TransportEmptyState({ label }: { label: string }) {
  return (
    <div className="border-2 border-dashed border-[var(--harvest-cream)] p-6">
      <Clock3
        aria-hidden="true"
        className="h-7 w-7 text-[var(--harvest-lime)]"
      />
      <p className="mt-4 font-bold">{label}</p>
      <Link
        className="mt-3 inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
        href="/transport"
      >
        Check transport <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function listingLocation(listing: ConceptHomeData["listings"][number]) {
  return (
    [listing.address.barangay, listing.address.municipality]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function formatPeso(value: number | null) {
  if (value === null) return "Check fare";
  return `₱${(value / 100).toLocaleString("en-PH")}`;
}

function routeFare(min: number | null, max: number | null) {
  if (min === null && max === null) return "Check fare";
  if (min === max || max === null) return formatPeso(min);
  if (min === null) return formatPeso(max);
  return `${formatPeso(min)}–${formatPeso(max)}`;
}

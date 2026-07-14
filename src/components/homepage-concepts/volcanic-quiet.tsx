import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BusFront,
  Clock3,
  MapPin,
  Route,
  Ship,
  Sparkles,
  Star,
  UserRound,
  Waves,
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
import type {
  DiscoveryCollection,
  DiscoveryListing,
} from "@/modules/listings/discovery";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

type FlexibleConceptData = ConceptHomeData & {
  listings?: DiscoveryListing[];
  featuredListings?: DiscoveryListing[];
  routes?: TransportRoute[];
  transportRoutes?: TransportRoute[];
  ferries?: FerrySchedule[];
  ferrySchedules?: FerrySchedule[];
  collections?: DiscoveryCollection[];
};

const categoryNames: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Stay",
  restaurant: "Food",
  activity: "Experience",
  service: "Service",
};

export function VolcanicQuiet({ data }: { data: ConceptHomeData }) {
  const conceptData = data as FlexibleConceptData;
  const listings = (
    conceptData.listings ??
    conceptData.featuredListings ??
    []
  ).slice(0, 6);
  const collections = (conceptData.collections ?? []).slice(0, 2);
  const claimHref = listings[0]
    ? `/portal/claims/new?listing=${encodeURIComponent(listings[0].slug)}`
    : "/search";
  const routes = (
    conceptData.routes ??
    conceptData.transportRoutes ??
    []
  ).filter((route) => route.mode !== "ferry");
  const ferries = (
    conceptData.ferries ??
    conceptData.ferrySchedules ??
    []
  ).slice(0, 2);

  return (
    <div className="vq-page min-h-screen overflow-x-hidden bg-[#F3EDE3] text-[#111310] [font-family:var(--font-vq-sans)]">
      <style>{volcanicStyles}</style>

      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/15 text-white">
        <nav
          aria-label="Volcanic Quiet navigation"
          className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"
        >
          <div className="vq-brand-light">
            <ConceptBrand homeHref="/homepage-concepts/volcanic-quiet" />
          </div>
          <div className="hidden items-center gap-8 text-[13px] font-semibold uppercase tracking-[0.16em] md:flex">
            <Link
              className="vq-focus py-4 transition-colors hover:text-[#DFAF45]"
              href="/search"
            >
              Discover
            </Link>
            <Link
              className="vq-focus py-4 transition-colors hover:text-[#DFAF45]"
              href="/transport"
            >
              Getting around
            </Link>
            <Link
              className="vq-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-5 transition-colors hover:border-[#DFAF45] hover:bg-[#DFAF45] hover:text-[#111310]"
              href="/account"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              Account
            </Link>
          </div>
          <Link
            aria-label="Open your account"
            className="vq-focus inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 md:hidden"
            href="/account"
          >
            <UserRound aria-hidden="true" className="h-5 w-5" />
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="vq-hero relative flex min-h-[760px] items-end overflow-hidden bg-[#111310] text-white sm:min-h-[820px]">
          <ResponsiveHeroArt
            desktopSrc="/homepage-concepts/volcanic-quiet/hero-desktop.webp"
            mobileSrc="/homepage-concepts/volcanic-quiet/hero-mobile.webp"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,19,16,.42)_0%,rgba(17,19,16,.12)_35%,rgba(17,19,16,.92)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,transparent,#111310)]" />

          <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-8 pt-36 sm:px-8 sm:pb-12 lg:px-12 lg:pb-14">
            <div className="vq-reveal max-w-5xl">
              <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#DFAF45] sm:text-xs">
                <span className="h-px w-8 bg-[#DFAF45]" />
                Davao City + Samal Island
              </p>
              <h1 className="max-w-4xl text-[clamp(3.5rem,9vw,8.4rem)] leading-[0.82] tracking-[-0.045em] [font-family:var(--font-vq-serif)]">
                Davao, From City Lights to Island Mornings.
              </h1>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/80 sm:mt-10">
                <Link className="vq-inline-link vq-focus" href="/samal/resorts">
                  Samal resorts{" "}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  className="vq-inline-link vq-focus"
                  href="/davao-city/restaurants"
                >
                  Davao food{" "}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="vq-inline-link vq-focus" href="/transport">
                  Plan the way{" "}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="vq-search-shell mt-10 rounded-[1.15rem] border border-white/20 bg-[#F3EDE3]/95 p-3 text-[#111310] shadow-[0_24px_80px_rgba(0,0,0,.38)] backdrop-blur-xl sm:mt-12 sm:p-4 lg:ml-auto lg:max-w-5xl">
              <div className="mb-3 flex items-center justify-between px-1 sm:px-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#503328]">
                  Where shall we begin?
                </p>
                <p className="hidden text-xs text-[#503328]/70 sm:block">
                  Search places across the city and island
                </p>
              </div>
              <ConceptSearchForm variant="volcanic" />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="vq-categories-title"
          className="border-b border-[#503328]/20 bg-[#F3EDE3]"
        >
          <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12">
            <h2 className="sr-only" id="vq-categories-title">
              Browse Davao and Samal by category
            </h2>
            <div className="vq-category-ribbon overflow-x-auto pb-1">
              <ConceptCategoryLinks variant="volcanic" />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="vq-detour-title"
          className="bg-[#F3EDE3] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10 grid gap-6 border-t border-[#503328]/30 pt-5 md:grid-cols-[1fr_1.25fr] md:items-end md:gap-12 lg:mb-14">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#D94D86]">
                  Curated for the curious
                </p>
                <h2
                  className="mt-4 text-5xl leading-none tracking-[-0.03em] sm:text-6xl lg:text-7xl [font-family:var(--font-vq-serif)]"
                  id="vq-detour-title"
                >
                  Worth the detour.
                </h2>
              </div>
              <div className="md:flex md:items-end md:justify-between md:gap-8">
                <p className="max-w-xl text-base leading-7 text-[#503328]/80 sm:text-lg">
                  Places with a point of view—from quiet shores to kitchens
                  worth crossing town for.
                </p>
                <Link
                  className="vq-dark-link vq-focus mt-5 inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold md:mt-0"
                  href="/search"
                >
                  Explore all
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {listings.length > 0 ? (
              <div className="vq-mosaic">
                {listings.map((listing, index) => (
                  <ListingTile
                    index={index}
                    key={listing.id}
                    listing={listing}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-[#503328]/25 bg-[#E9DFD1] px-6 py-12 text-center sm:px-10 sm:py-16">
                <Sparkles
                  aria-hidden="true"
                  className="mx-auto h-8 w-8 text-[#D94D86]"
                />
                <h3 className="mt-5 text-3xl [font-family:var(--font-vq-serif)]">
                  Begin with what calls to you.
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-[#503328]/75">
                  Fresh recommendations are being prepared. Browse by category
                  to find an island stay, city table, or memorable day out.
                </p>
                <div className="vq-empty-categories mx-auto mt-7 max-w-3xl">
                  <ConceptCategoryLinks variant="volcanic" />
                </div>
              </div>
            )}
          </div>
        </section>

        <TransportStory ferries={ferries} routes={routes} />

        <section
          aria-labelledby="vq-collections-title"
          className="bg-[#111310] px-5 py-20 text-[#F3EDE3] sm:px-8 sm:py-28 lg:px-12 lg:py-32"
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="grid gap-5 border-t border-[#F3EDE3]/25 pt-5 md:grid-cols-[1fr_1.25fr] md:items-end">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#DFAF45]">
                Two ways into the region
              </p>
              <div>
                <h2
                  className="max-w-3xl text-5xl leading-none tracking-[-0.035em] sm:text-6xl lg:text-7xl [font-family:var(--font-vq-serif)]"
                  id="vq-collections-title"
                >
                  Follow a story, not a checklist.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-[#F3EDE3]/65">
                  Slow down, stay longer, and let one good place lead to the
                  next.
                </p>
              </div>
            </div>

            <div className="mt-14 space-y-8 sm:mt-16 sm:space-y-12">
              {collections.length > 0 ? (
                collections.map((collection, index) => (
                  <CollectionChapter
                    collection={collection}
                    index={index}
                    key={collection.id}
                  />
                ))
              ) : (
                <div className="grid min-h-[360px] place-items-center rounded-[1.5rem] border border-white/15 bg-[#1A1D18] px-6 text-center">
                  <div>
                    <Waves
                      aria-hidden="true"
                      className="mx-auto h-9 w-9 text-[#DFAF45]"
                    />
                    <h3 className="mt-5 text-4xl [font-family:var(--font-vq-serif)]">
                      New field notes are on their way.
                    </h3>
                    <Link
                      className="vq-gold-button vq-focus mt-7"
                      href="/search"
                    >
                      Browse all places{" "}
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-[#DFAF45] px-5 py-16 text-[#111310] sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-[1.3fr_.7fr] md:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#503328]">
                Made by people who know the place
              </p>
              <h2 className="mt-4 max-w-4xl text-5xl leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-7xl [font-family:var(--font-vq-serif)]">
                Your place deserves to be found well.
              </h2>
            </div>
            <div className="md:text-right">
              <p className="mb-6 max-w-md text-base leading-7 text-[#503328] md:ml-auto">
                Keep your details accurate, meet the right guests, and share
                what makes your corner of Davao or Samal special.
              </p>
              <Link
                className="vq-focus inline-flex min-h-12 items-center gap-3 rounded-full bg-[#111310] px-6 text-sm font-bold text-[#F3EDE3] transition-transform hover:-translate-y-0.5"
                href={claimHref}
              >
                Claim your listing
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0C0E0B] px-5 pb-28 pt-14 text-[#F3EDE3] sm:px-8 md:pb-10 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 border-b border-white/15 pb-12 md:grid-cols-[1.25fr_.75fr_.75fr]">
            <div>
              <div className="vq-brand-light inline-block">
                <ConceptBrand homeHref="/homepage-concepts/volcanic-quiet" />
              </div>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
                Thoughtful discovery and practical ways around Davao City +
                Samal Island.
              </p>
            </div>
            <FooterNav
              label="Explore"
              links={[
                ["All places", "/search"],
                ["Samal resorts", "/samal/resorts"],
                ["Davao food", "/davao-city/restaurants"],
                ["Transport", "/transport"],
              ]}
            />
            <FooterNav
              label="Pasadya"
              links={[
                ["Your account", "/account"],
                ["Claim a listing", claimHref],
                ["Privacy", "/legal/privacy"],
                ["Terms", "/legal/terms"],
              ]}
            />
          </div>
          <div className="flex flex-col gap-4 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Pasadya. Davao City + Samal Island.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <Link
                className="vq-focus inline-flex min-h-11 items-center hover:text-white"
                href="/legal/transport-disclaimer"
              >
                Transport disclaimer
              </Link>
              <Link
                className="vq-focus inline-flex min-h-11 items-center hover:text-white"
                href="/legal/cancellation-policy"
              >
                Cancellation policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <div className="vq-mobile-nav md:hidden">
        <ConceptMobileNav
          homeHref="/homepage-concepts/volcanic-quiet"
          variant="volcanic"
        />
      </div>
    </div>
  );
}

function ListingTile({
  listing,
  index,
}: {
  listing: DiscoveryListing;
  index: number;
}) {
  const image = listing.media[0];
  const place =
    listing.address.municipality ?? listing.address.barangay ?? "Davao region";

  return (
    <article className={`vq-listing vq-listing-${index + 1}`}>
      <Link
        className="vq-focus group relative flex h-full min-h-[320px] overflow-hidden rounded-[1.15rem] bg-[#503328] text-white"
        href={`/place/${listing.slug}`}
      >
        {image ? (
          <Image
            alt={image.caption ?? `${listing.name} in ${place}`}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            fill
            loading="lazy"
            sizes={
              index === 0
                ? "(min-width: 1024px) 58vw, 100vw"
                : "(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
            }
            src={image.url}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(223,175,69,.8),transparent_25%),linear-gradient(145deg,#503328,#111310)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,19,16,.03)_25%,rgba(17,19,16,.9)_100%)]" />
        <div className="absolute left-4 top-4 flex items-center gap-2 sm:left-5 sm:top-5">
          <span className="rounded-full bg-[#F3EDE3]/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#111310]">
            {categoryNames[listing.category]}
          </span>
          {listing.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#111310]/65 px-2.5 py-1.5 text-xs font-semibold backdrop-blur">
              <Star
                aria-hidden="true"
                className="h-3.5 w-3.5 fill-[#DFAF45] text-[#DFAF45]"
              />
              {listing.ratingAvg.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="relative mt-auto w-full p-5 sm:p-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {place}
          </p>
          <div className="flex items-end justify-between gap-5">
            <h3 className="max-w-xl text-3xl leading-[1.02] sm:text-4xl [font-family:var(--font-vq-serif)]">
              {listing.name}
            </h3>
            <span className="mb-1 shrink-0 text-right text-xs font-semibold text-[#DFAF45] sm:text-sm">
              {formatConceptPrice(listing.priceMin)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function TransportStory({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const route = routes[0];
  const ferry = ferries[0];

  return (
    <section
      aria-labelledby="vq-transport-title"
      className="relative overflow-hidden bg-[#503328] px-5 py-20 text-[#F3EDE3] sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="absolute -right-40 top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full border border-[#DFAF45]/20" />
      <div className="absolute -right-20 top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full border border-[#DFAF45]/20" />
      <div className="relative mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#DFAF45]">
            The journey is part of it
          </p>
          <h2
            className="mt-5 max-w-2xl text-5xl leading-[0.96] tracking-[-0.035em] sm:text-6xl lg:text-7xl [font-family:var(--font-vq-serif)]"
            id="vq-transport-title"
          >
            City roads. Sea crossings. One good day out.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#F3EDE3]/68">
            Compare local routes and current ferry details before you leave.
            Fares and times can change, so confirm at the terminal.
          </p>
          <Link className="vq-gold-button vq-focus mt-8" href="/transport">
            Plan your route
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {route || ferry ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {route ? (
              <Link
                className="vq-focus group flex min-h-[270px] flex-col rounded-[1.35rem] border border-white/15 bg-[#111310]/30 p-6 backdrop-blur-sm transition-transform hover:-translate-y-1 sm:min-h-[330px]"
                href="/transport"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#D94D86] text-white">
                    <BusFront aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-5 w-5 text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
                <div className="mt-auto">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#DFAF45]">
                    {modeName(route.mode)} route
                  </p>
                  <h3 className="mt-3 text-3xl leading-tight [font-family:var(--font-vq-serif)]">
                    {route.name}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Route aria-hidden="true" className="h-3.5 w-3.5" />
                      {route.stops.length} stops
                    </span>
                    <span>{routeFare(route)}</span>
                  </div>
                </div>
              </Link>
            ) : null}

            {ferry ? (
              <Link
                className="vq-focus group flex min-h-[270px] flex-col rounded-[1.35rem] bg-[#DFAF45] p-6 text-[#111310] transition-transform hover:-translate-y-1 sm:min-h-[330px] sm:translate-y-10"
                href="/transport"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#111310] text-[#F3EDE3]">
                    <Ship aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-5 w-5 text-[#503328] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
                <div className="mt-auto">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#503328]">
                    Ferry crossing
                  </p>
                  <h3 className="mt-3 text-3xl leading-tight [font-family:var(--font-vq-serif)]">
                    {ferry.origin} <span aria-hidden="true">↔</span>{" "}
                    {ferry.destination}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#503328]">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                      Around {ferry.durationMinutes} min
                    </span>
                    <span>{formatConceptPrice(ferry.fare)}</span>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-white/15 bg-[#111310]/25 p-8 text-center sm:p-12">
            <MapPin
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-[#DFAF45]"
            />
            <h3 className="mt-5 text-3xl [font-family:var(--font-vq-serif)]">
              Route details are refreshing.
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/65">
              Open the transport planner for the latest available ways between
              Davao City and Samal Island.
            </p>
            <Link className="vq-gold-button vq-focus mt-7" href="/transport">
              Check transport{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionChapter({
  collection,
  index,
}: {
  collection: DiscoveryCollection;
  index: number;
}) {
  return (
    <Link
      className={`vq-focus group grid overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#1A1D18] md:min-h-[440px] md:grid-cols-2 ${
        index % 2 ? "md:[&_.vq-collection-image]:order-2" : ""
      }`}
      href={`/collections/${collection.slug}`}
    >
      <div className="vq-collection-image relative min-h-[300px] overflow-hidden bg-[#503328] md:min-h-full">
        {collection.coverImage ? (
          <Image
            alt=""
            className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
            fill
            loading="lazy"
            sizes="(min-width: 768px) 50vw, 100vw"
            src={collection.coverImage}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_25%,rgba(217,77,134,.8),transparent_24%),radial-gradient(circle_at_70%_70%,rgba(223,175,69,.75),transparent_24%),linear-gradient(135deg,#503328,#111310)]" />
        )}
      </div>
      <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DFAF45]">
            Field note {String(index + 1).padStart(2, "0")}
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/20 transition-colors group-hover:border-[#DFAF45] group-hover:bg-[#DFAF45] group-hover:text-[#111310]">
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-16 md:mt-8">
          <h3 className="text-4xl leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-6xl [font-family:var(--font-vq-serif)]">
            {collection.title}
          </h3>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
            {collection.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function FooterNav({
  label,
  links,
}: {
  label: string;
  links: Array<[string, string]>;
}) {
  return (
    <nav aria-label={label}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DFAF45]">
        {label}
      </p>
      <ul className="mt-5 space-y-3 text-sm text-white/60">
        {links.map(([name, href]) => (
          <li key={href}>
            <Link
              className="vq-focus inline-flex min-h-11 min-w-11 items-center hover:text-white"
              href={href}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function modeName(mode: TransportRoute["mode"]) {
  return mode.replace("_", " ");
}

function routeFare(route: TransportRoute) {
  if (route.fareMin === null && route.fareMax === null) {
    return "Ask for fare";
  }
  if (route.fareMin === route.fareMax || route.fareMax === null) {
    return formatConceptPrice(route.fareMin);
  }
  return `${formatConceptPrice(route.fareMin)}–${formatConceptPrice(route.fareMax)}`;
}

const volcanicStyles = String.raw`
  .vq-page { --vq-focus: #DFAF45; }
  .vq-page .vq-focus:focus-visible {
    outline: 2px solid var(--vq-focus);
    outline-offset: 4px;
  }
  .vq-page .vq-brand-light { color: #F3EDE3; }
  .vq-page .vq-brand-light img { filter: none; }
  .vq-page .vq-inline-link {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: .35rem;
    border-bottom: 1px solid rgba(255,255,255,.42);
    transition: color .25s ease, border-color .25s ease;
  }
  .vq-page .vq-inline-link:hover { color: #DFAF45; border-color: #DFAF45; }
  .vq-page .vq-dark-link { border-bottom: 1px solid rgba(80,51,40,.45); }
  .vq-page .vq-dark-link:hover { border-color: #111310; }
  .vq-page .vq-gold-button {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    gap: .65rem;
    border-radius: 9999px;
    background: #DFAF45;
    color: #111310;
    padding: .75rem 1.4rem;
    font-size: .875rem;
    font-weight: 800;
    transition: transform .25s ease, background-color .25s ease;
  }
  .vq-page .vq-gold-button:hover { transform: translateY(-2px); background: #E9BF5E; }
  .vq-page .vq-search-shell form { display: grid; gap: .65rem; }
  .vq-page .vq-search-shell input,
  .vq-page .vq-search-shell select {
    min-height: 48px;
    border-color: rgba(80,51,40,.25);
    background: #FFF9F0;
    color: #111310;
  }
  .vq-page .vq-search-shell select option { background: #111310; color: #F3EDE3; }
  .vq-page .vq-search-shell button {
    min-height: 48px;
    border-radius: .7rem;
    background: #D94D86;
    color: white;
    box-shadow: none;
  }
  .vq-page .vq-search-shell button:hover { background: #C53B74; }
  .vq-page .vq-search-shell :is(input,select,button):focus-visible {
    outline: 2px solid #DFAF45;
    outline-offset: 2px;
  }
  .vq-page .vq-category-ribbon > * {
    display: flex;
    min-width: max-content;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
  }
  .vq-page .vq-category-ribbon a,
  .vq-page .vq-empty-categories a {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: 1px solid rgba(80,51,40,.25);
    padding: .6rem 1rem;
    color: #503328;
    font-size: .75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .12em;
    transition: background-color .2s ease, color .2s ease, border-color .2s ease;
  }
  .vq-page .vq-category-ribbon a:hover,
  .vq-page .vq-empty-categories a:hover {
    border-color: #111310;
    background: #111310;
    color: #F3EDE3;
  }
  .vq-page .vq-category-ribbon a:focus-visible,
  .vq-page .vq-empty-categories a:focus-visible {
    outline: 2px solid #D94D86;
    outline-offset: 2px;
  }
  .vq-page .vq-empty-categories > * { display: flex; flex-wrap: wrap; justify-content: center; gap: .65rem; }
  .vq-page .vq-mosaic { display: grid; gap: 1rem; }
  .vq-page .vq-listing { min-width: 0; }
  .vq-page .vq-mobile-nav > * {
    border-color: rgba(80,51,40,.2);
    background: rgba(243,237,227,.96);
    color: #111310;
    backdrop-filter: blur(18px);
  }
  .vq-page .vq-mobile-nav a { min-height: 48px; }
  .vq-page .vq-mobile-nav a:focus-visible { outline: 2px solid #D94D86; outline-offset: -2px; }
  .vq-page .vq-reveal { animation: vq-rise .8s cubic-bezier(.2,.75,.2,1) both; }
  @keyframes vq-rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (min-width: 640px) {
    .vq-page .vq-search-shell form { grid-template-columns: minmax(0, 1.5fr) minmax(150px, .7fr) auto; align-items: end; }
    .vq-page .vq-search-shell button { min-width: 130px; }
  }
  @media (min-width: 768px) {
    .vq-page .vq-mosaic {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .vq-page .vq-listing-1 { grid-column: 1 / -1; }
    .vq-page .vq-listing-1 > a { min-height: 560px; }
    .vq-page .vq-listing-2 > a,
    .vq-page .vq-listing-3 > a { min-height: 380px; }
  }
  @media (min-width: 1024px) {
    .vq-page .vq-mosaic {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-auto-rows: 112px;
    }
    .vq-page .vq-listing > a { min-height: 0; }
    .vq-page .vq-listing-1 { grid-column: 1 / span 7; grid-row: 1 / span 5; }
    .vq-page .vq-listing-2 { grid-column: 8 / span 5; grid-row: 1 / span 3; }
    .vq-page .vq-listing-3 { grid-column: 8 / span 5; grid-row: 4 / span 2; }
    .vq-page .vq-listing-4 { grid-column: 1 / span 4; grid-row: 6 / span 3; }
    .vq-page .vq-listing-5 { grid-column: 5 / span 4; grid-row: 6 / span 3; }
    .vq-page .vq-listing-6 { grid-column: 9 / span 4; grid-row: 6 / span 3; }
    .vq-page .vq-listing-1 > a { min-height: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .vq-page .vq-reveal { animation: none; }
  }
`;

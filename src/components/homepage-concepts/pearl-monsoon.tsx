import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  MapPin,
  Route,
  Search,
  Ship,
  Star,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { PearlMonsoonComposer } from "@/components/homepage-concepts/pearl-monsoon-composer";
import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import {
  ConceptBrand,
  formatConceptPrice,
} from "@/components/homepage-concepts/shared";
import type {
  DiscoveryCollection,
  DiscoveryListing,
} from "@/modules/listings/search";

const categoryLabels: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food & drink",
  activity: "Activity",
  service: "Local service",
};

const categoryLinks = [
  ["Resorts", "/search?category=resort"],
  ["Rooms", "/search?category=room"],
  ["Food", "/search?category=restaurant"],
  ["Activities", "/search?category=activity"],
  ["Services", "/search?category=service"],
] as const;

export function PearlMonsoon({ data }: { data: ConceptHomeData }) {
  const listings = uniqueListings([...data.featuredListings, ...data.listings]);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F4F7FA] text-[#19324A] selection:bg-[#C79A62] selection:text-[#19324A] [font-family:var(--font-pearl-sans)]">
      <PearlHeader />

      <main id="main-content">
        <PearlHero />

        <section
          aria-labelledby="pearl-composer-title"
          className="relative overflow-hidden bg-[#E6EEF2] px-4 py-16 sm:px-7 sm:py-24 lg:px-10"
        >
          <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full border-[3.75rem] border-[#86B7C9]/12" />
          <div className="relative mx-auto max-w-[90rem]">
            <div className="grid gap-7 border-t border-[#19324A]/20 pt-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.55fr)] lg:items-end lg:gap-16">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#7B5B37]">
                  Journey composer · route before room
                </p>
                <h2
                  className="mt-4 max-w-4xl text-[clamp(2.9rem,5.5vw,5.8rem)] font-semibold leading-[0.9] tracking-[-0.045em] [font-family:var(--font-pearl-serif)]"
                  id="pearl-composer-title"
                >
                  Connect the crossing to the place.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-[#19324A]/68 sm:text-base">
                Start from a published route or ferry note, choose an area, and
                compare real directory listings without losing sight of the
                practical journey.
              </p>
            </div>

            <div className="mt-10 sm:mt-12">
              <PearlMonsoonComposer
                ferries={data.ferries}
                listings={listings}
                routes={data.routes}
              />
            </div>
          </div>
        </section>

        <ListingPortfolio listings={listings.slice(0, 4)} />
        <GuideCollection collections={data.collections} />
        <OwnerInvitation />
      </main>

      <PearlFooter collections={data.collections} />
    </div>
  );
}

function PearlHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#19324A]/12 bg-[#F4F7FA]/92 backdrop-blur-xl">
      <nav
        aria-label="Pearl Monsoon navigation"
        className="mx-auto flex min-h-[4.5rem] max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="[&_a]:!rounded-lg [&_a]:!text-[#19324A] [&_img]:!rounded-lg [&_span:first-child]:!rounded-lg [&_span:first-child]:!ring-[#19324A]/15">
            <ConceptBrand homeHref="/homepage-concepts/pearl-monsoon" />
          </div>
          <span
            aria-hidden="true"
            className="hidden h-7 w-px bg-[#19324A]/15 sm:block"
          />
          <Link
            className="hidden min-h-11 items-center gap-2 rounded-lg px-2 text-[0.65rem] font-bold uppercase tracking-[0.17em] text-[#7B5B37] outline-none hover:bg-[#E6EEF2] focus-visible:ring-2 focus-visible:ring-[#C79A62] sm:inline-flex"
            href="/homepage-concepts"
          >
            <span className="h-2 w-2 rounded-full bg-[#86B7C9]" />
            Private concept · Pearl Monsoon
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <HeaderLink href="/search">Places</HeaderLink>
          <HeaderLink href="/transport">Transport</HeaderLink>
          <Link
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#19324A] px-5 text-sm font-bold text-white outline-none transition hover:bg-[#30221D] focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2 motion-reduce:transition-none"
            href="/search"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            Begin exploring
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            aria-label="Search places"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#19324A]/15 bg-white text-[#19324A] outline-none focus-visible:ring-2 focus-visible:ring-[#C79A62]"
            href="/search"
          >
            <Search aria-hidden="true" className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Open transport guide"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#19324A] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2"
            href="/transport"
          >
            <Route aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold text-[#19324A]/68 outline-none transition hover:bg-[#E6EEF2] hover:text-[#19324A] focus-visible:ring-2 focus-visible:ring-[#C79A62] motion-reduce:transition-none"
      href={href}
    >
      {children}
    </Link>
  );
}

function PearlHero() {
  return (
    <section
      aria-labelledby="pearl-hero-title"
      className="relative overflow-hidden border-b border-[#19324A]/12 bg-[#F4F7FA]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_calc(50%-1px),rgba(25,50,74,0.05)_50%,transparent_calc(50%+1px))]" />
      <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[90rem] lg:grid-cols-[minmax(0,0.94fr)_minmax(28rem,1.06fr)]">
        <div className="flex flex-col justify-center px-4 py-12 sm:px-7 sm:py-16 lg:px-10 lg:py-20">
          <p className="flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#7B5B37]">
            <span className="h-px w-10 bg-[#C79A62]" />
            Davao City · Samal Island
          </p>
          <h1
            className="mt-6 max-w-4xl text-[clamp(3.6rem,7vw,7.4rem)] font-semibold leading-[0.82] tracking-[-0.055em] text-[#19324A] [font-family:var(--font-pearl-serif)]"
            id="pearl-hero-title"
          >
            Arrive with the{" "}
            <span className="italic text-[#4B7F94]">whole journey</span> in
            view.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#19324A]/68 sm:text-lg sm:leading-8">
            A transport-first local guide to island stays, city tables, and the
            published routes between them—composed for thoughtful planning.
          </p>

          <PearlSearch />

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-[#19324A]/62">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg outline-none transition hover:text-[#19324A] focus-visible:ring-2 focus-visible:ring-[#C79A62] motion-reduce:transition-none"
              href="/transport"
            >
              <Ship aria-hidden="true" className="h-4 w-4 text-[#4B7F94]" />
              Read the transport guide
            </Link>
            <span className="hidden h-1 w-1 rounded-full bg-[#C79A62] sm:block" />
            <span>Guide fares and published times · confirm locally</span>
          </div>
        </div>

        <div className="relative min-h-[31rem] px-4 pb-5 sm:px-7 sm:pb-8 lg:min-h-full lg:px-8 lg:pb-8 lg:pt-8">
          <div className="absolute bottom-12 left-10 right-0 top-0 bg-[#86B7C9]/24 lg:bottom-16 lg:left-0 lg:top-20" />
          <div className="absolute bottom-5 left-4 right-8 top-8 border border-[#C79A62]/55 sm:left-7 lg:bottom-8 lg:left-8 lg:right-16 lg:top-8" />
          <figure className="relative h-full min-h-[29rem] overflow-hidden bg-[#19324A] shadow-[0_30px_90px_rgba(25,50,74,0.22)] lg:min-h-[calc(100svh-8.5rem)]">
            <ResponsiveHeroArt
              className="object-cover object-center"
              desktopMedia="(min-width: 1024px)"
              desktopSizes="(min-width: 1440px) 45vw, (min-width: 1024px) 52vw, 100vw"
              desktopSrc="/homepage-concepts/shared-photography/samal-shore-desktop.webp"
              mobileSizes="100vw"
              mobileSrc="/homepage-concepts/shared-photography/samal-shore-mobile.webp"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,50,74,0.08),rgba(25,50,74,0.08)_55%,rgba(25,50,74,0.82))]" />
            <figcaption className="absolute inset-x-5 bottom-5 flex flex-col gap-4 border-t border-white/35 pt-4 text-white sm:inset-x-7 sm:bottom-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#DDECF1]">
                  Island approach · visual field note
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none [font-family:var(--font-pearl-serif)]">
                  Shore, route, destination.
                </p>
              </div>
              <span className="inline-flex min-h-11 w-fit items-center rounded-full border border-white/35 bg-[#19324A]/45 px-4 text-xs font-bold backdrop-blur">
                Pearl Monsoon / 07
              </span>
            </figcaption>
          </figure>

          <div className="absolute right-1 top-14 hidden w-44 border border-[#19324A]/12 bg-[#F4F7FA] p-4 shadow-[0_18px_50px_rgba(25,50,74,0.13)] sm:block lg:right-1 lg:top-20">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#7B5B37]">
              Plan in layers
            </p>
            <ol className="mt-3 space-y-2 text-xs font-bold text-[#19324A]">
              <li>01 · Choose the route</li>
              <li>02 · Read the crossing</li>
              <li>03 · Match the place</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function PearlSearch() {
  return (
    <form
      action="/search"
      className="mt-9 grid gap-2 rounded-[1.25rem] border border-[#19324A]/15 bg-white p-2 shadow-[0_20px_65px_rgba(25,50,74,0.10)] sm:grid-cols-[minmax(0,1fr)_9.75rem_auto] sm:items-end"
      method="get"
      role="search"
    >
      <label className="grid min-w-0 gap-1 rounded-xl bg-[#F4F7FA] px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#19324A]/55">
        Search places
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4B7F94]"
          />
          <input
            autoComplete="off"
            className="min-h-11 w-full bg-transparent pl-6 text-sm font-semibold normal-case tracking-normal text-[#19324A] outline-none placeholder:font-medium placeholder:text-[#19324A]/45 focus-visible:ring-2 focus-visible:ring-[#C79A62]"
            name="q"
            placeholder="A shore, table, or stay…"
            spellCheck={false}
            type="search"
          />
        </span>
      </label>
      <label className="grid gap-1 rounded-xl bg-[#F4F7FA] px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#19324A]/55">
        Area
        <select
          className="min-h-11 min-w-0 bg-transparent text-sm font-semibold normal-case tracking-normal text-[#19324A] outline-none focus-visible:ring-2 focus-visible:ring-[#C79A62]"
          defaultValue=""
          name="area"
        >
          <option value="">City + island</option>
          <option value="davao-city">Davao City</option>
          <option value="samal">Samal Island</option>
        </select>
      </label>
      <button
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#19324A] px-5 text-sm font-bold text-white outline-none transition hover:bg-[#30221D] focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2 motion-reduce:transition-none sm:min-h-full"
        type="submit"
      >
        <Compass aria-hidden="true" className="h-4 w-4" />
        Find a place
      </button>
    </form>
  );
}

function ListingPortfolio({ listings }: { listings: DiscoveryListing[] }) {
  return (
    <section
      aria-labelledby="pearl-listings-title"
      className="bg-[#F4F7FA] px-4 py-16 sm:px-7 sm:py-24 lg:px-10"
    >
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-6 border-t border-[#19324A]/20 pt-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#7B5B37]">
              The destination edit
            </p>
            <h2
              className="mt-4 max-w-4xl text-[clamp(2.8rem,5.5vw,5.8rem)] font-semibold leading-[0.9] tracking-[-0.045em] [font-family:var(--font-pearl-serif)]"
              id="pearl-listings-title"
            >
              Places worth plotting into the route.
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-[#19324A] outline-none transition hover:text-[#4B7F94] focus-visible:ring-2 focus-visible:ring-[#C79A62] motion-reduce:transition-none"
            href="/search"
          >
            Browse every listing
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {listings.length > 0 ? (
          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            {listings.map((listing, index) => (
              <ListingPanel index={index} key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <EmptyListings />
        )}
      </div>
    </section>
  );
}

function ListingPanel({
  listing,
  index,
}: {
  listing: DiscoveryListing;
  index: number;
}) {
  const wide = index % 4 === 0 || index % 4 === 3;
  const image = listing.media[0];

  return (
    <article
      className={`group relative min-h-[27rem] overflow-hidden bg-[#19324A] ${
        wide ? "lg:col-span-7" : "lg:col-span-5"
      }`}
    >
      <Image
        alt={
          image?.caption ??
          `${listing.name}, a published place in ${formatAddress(listing)}`
        }
        className="object-cover transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
        fill
        loading="lazy"
        sizes={
          wide
            ? "(min-width: 1024px) 58vw, 100vw"
            : "(min-width: 1024px) 42vw, 100vw"
        }
        src={image?.url ?? fallbackListingImage(listing, index)}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,50,74,0.08),rgba(25,50,74,0.16)_40%,rgba(25,50,74,0.92))]" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-6">
        <span className="rounded-full bg-[#F4F7FA]/92 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#19324A] backdrop-blur">
          {categoryLabels[listing.category]}
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[#19324A]/35 text-white backdrop-blur transition group-hover:bg-[#C79A62] group-hover:text-[#19324A] motion-reduce:transition-none">
          <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="flex items-start gap-2 text-xs font-bold text-white/72">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D7B88D]"
          />
          {formatAddress(listing)}
        </p>
        <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-[0.98] tracking-[-0.03em] [font-family:var(--font-pearl-serif)] sm:text-4xl">
          {listing.name}
        </h3>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/25 pt-4 text-xs font-bold">
          <span>{formatConceptPrice(listing.priceMin)}</span>
          {listing.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Star
                aria-hidden="true"
                className="h-3.5 w-3.5 fill-[#D7B88D] text-[#D7B88D]"
              />
              {listing.ratingAvg.toFixed(1)} · {listing.ratingCount} reviews
            </span>
          ) : (
            <span className="text-white/62">New to the directory</span>
          )}
        </div>
      </div>
      <Link
        aria-label={`View ${listing.name}`}
        className="absolute inset-0 outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#D7B88D]"
        href={`/place/${listing.slug}`}
      />
    </article>
  );
}

function EmptyListings() {
  return (
    <div className="mt-10 grid min-h-[22rem] place-items-center border-y border-[#19324A]/15 bg-white px-6 py-14 text-center">
      <div className="max-w-lg">
        <Compass
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-[#C79A62]"
        />
        <h3 className="mt-5 text-3xl font-semibold [font-family:var(--font-pearl-serif)]">
          The next destination edit is taking shape.
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#19324A]/65">
          Open the full search to see newly published places across Davao City
          and Samal Island.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#19324A] px-5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#C79A62] focus-visible:ring-offset-2"
          href="/search"
        >
          Search places
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function GuideCollection({
  collections,
}: {
  collections: DiscoveryCollection[];
}) {
  const guides = collections.slice(0, 2);

  return (
    <section
      aria-labelledby="pearl-guides-title"
      className="relative overflow-hidden bg-[#19324A] px-4 py-16 text-white sm:px-7 sm:py-24 lg:px-10"
    >
      <div className="pointer-events-none absolute -right-28 top-16 h-96 w-96 rounded-full border-[5rem] border-[#86B7C9]/8" />
      <div className="relative mx-auto max-w-[90rem]">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.52fr)] lg:items-end lg:gap-20">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#D7B88D]">
              Field guides · edited ways in
            </p>
            <h2
              className="mt-4 max-w-4xl text-[clamp(2.9rem,5.5vw,5.8rem)] font-semibold leading-[0.9] tracking-[-0.045em] [font-family:var(--font-pearl-serif)]"
              id="pearl-guides-title"
            >
              Follow a collection, not a checklist.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/62 sm:text-base">
            Short editorial paths through places already in the directory, ready
            to pair with your preferred city or island connection.
          </p>
        </div>

        {guides.length > 0 ? (
          <div className="mt-11 grid gap-5 lg:grid-cols-2">
            {guides.map((collection, index) => (
              <GuidePanel
                collection={collection}
                index={index}
                key={collection.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-11 border border-white/15 bg-white/[0.045] p-7 sm:p-10">
            <h3 className="text-3xl font-semibold [font-family:var(--font-pearl-serif)]">
              New field guides are being assembled.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">
              The full place directory remains open while the next collection
              takes shape.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C79A62] px-5 text-sm font-bold text-[#19324A] outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/search"
            >
              Browse all places
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function GuidePanel({
  collection,
  index,
}: {
  collection: DiscoveryCollection;
  index: number;
}) {
  return (
    <Link
      className="group grid min-h-[31rem] overflow-hidden border border-white/15 bg-[#F4F7FA] text-[#19324A] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#D7B88D] focus-visible:ring-offset-4 focus-visible:ring-offset-[#19324A] motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[minmax(13rem,0.9fr)_minmax(0,1.1fr)]"
      href={`/collections/${collection.slug}`}
    >
      <span className="relative min-h-[18rem] overflow-hidden bg-[#30221D] sm:min-h-full">
        <Image
          alt=""
          className="object-cover transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
          fill
          loading="lazy"
          sizes="(min-width: 1024px) 24vw, (min-width: 640px) 42vw, 100vw"
          src={
            collection.coverImage ??
            (index === 0
              ? "/homepage-concepts/shared-photography/samal-dock-desktop.webp"
              : "/homepage-concepts/shared-photography/samal-shore-desktop.webp")
          }
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#19324A]/78 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
          Guide {String(index + 1).padStart(2, "0")}
        </span>
      </span>
      <span className="flex flex-col p-6 sm:p-7">
        <span className="flex items-center justify-between gap-4">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.17em] text-[#7B5B37]">
            {collection.listingIds.length}{" "}
            {collection.listingIds.length === 1 ? "place" : "places"}
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#19324A]/15 transition group-hover:border-[#19324A] group-hover:bg-[#19324A] group-hover:text-white motion-reduce:transition-none">
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </span>
        <span className="mt-10 block text-3xl font-semibold leading-[0.98] tracking-[-0.03em] [font-family:var(--font-pearl-serif)] sm:text-4xl">
          {collection.title}
        </span>
        <span className="mt-5 line-clamp-4 text-sm leading-6 text-[#19324A]/65">
          {collection.description}
        </span>
        <span className="mt-auto pt-8 text-sm font-bold text-[#4B7F94]">
          Open the collection
        </span>
      </span>
    </Link>
  );
}

function OwnerInvitation() {
  return (
    <section className="relative overflow-hidden bg-[#C79A62] px-4 py-16 text-[#19324A] sm:px-7 sm:py-20 lg:px-10">
      <div className="pointer-events-none absolute inset-y-0 right-[12%] w-px bg-[#19324A]/16" />
      <div className="mx-auto grid max-w-[90rem] gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] lg:items-end">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em]">
            For local owners · take your place
          </p>
          <h2 className="mt-4 max-w-5xl text-[clamp(3rem,6vw,6.2rem)] font-semibold leading-[0.86] tracking-[-0.05em] [font-family:var(--font-pearl-serif)]">
            Make your listing part of the journey.
          </h2>
        </div>
        <div className="relative lg:border-l lg:border-[#19324A]/25 lg:pl-8">
          <p className="text-base leading-7 text-[#19324A]/75">
            Claim your place to manage its profile and help travelers find the
            practical details they need.
          </p>
          <Link
            className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#19324A] px-6 text-sm font-bold text-white outline-none transition hover:bg-[#30221D] focus-visible:ring-2 focus-visible:ring-[#19324A] focus-visible:ring-offset-4 focus-visible:ring-offset-[#C79A62] motion-reduce:transition-none"
            href="/portal/claims/new"
          >
            Claim your listing
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PearlFooter({ collections }: { collections: DiscoveryCollection[] }) {
  const guideLinks = collections
    .slice(0, 2)
    .map(
      (collection) =>
        [collection.title, `/collections/${collection.slug}`] as [
          string,
          string,
        ],
    );

  return (
    <footer className="bg-[#30221D] px-4 pb-8 pt-14 text-[#F4F7FA] sm:px-7 sm:pt-20 lg:px-10">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-12 border-b border-white/12 pb-12 md:grid-cols-[minmax(17rem,1.1fr)_minmax(0,1.9fr)]">
          <div>
            <div className="[&_a]:!text-white [&_span:first-child]:!ring-white/20">
              <ConceptBrand homeHref="/homepage-concepts/pearl-monsoon" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/58">
              Transport-first local discovery for Davao City and Samal Island,
              with published journey notes kept beside the destination.
            </p>
            <span className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#D7B88D]">
              Pearl Monsoon · private preview
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterList
              label="Discover"
              links={[
                ["All places", "/search"],
                ["Davao City", "/search?area=davao-city"],
                ["Samal Island", "/search?area=samal"],
              ]}
            />
            <FooterList
              label="Plan"
              links={[["Transport guide", "/transport"], ...guideLinks]}
            />
            <FooterList
              label="Owners"
              links={[
                ["Claim a listing", "/portal/claims/new"],
                ["All concepts", "/homepage-concepts"],
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5 py-7 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>Pasadya · Route, crossing, place.</p>
          <nav
            aria-label="Browse place categories"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            {categoryLinks.slice(0, 3).map(([label, href]) => (
              <Link
                className="inline-flex min-h-11 min-w-11 items-center justify-center outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#D7B88D] motion-reduce:transition-none"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterList({
  label,
  links,
}: {
  label: string;
  links: [string, string][];
}) {
  return (
    <nav aria-label={`${label} footer links`}>
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#D7B88D]">
        {label}
      </p>
      <ul className="mt-4 space-y-1">
        {links.map(([text, href]) => (
          <li key={`${text}-${href}`}>
            <Link
              className="inline-flex min-h-11 items-center text-sm text-white/62 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#D7B88D] motion-reduce:transition-none"
              href={href}
            >
              {text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function uniqueListings(listings: DiscoveryListing[]) {
  return Array.from(
    new Map(listings.map((listing) => [listing.id, listing])).values(),
  );
}

function formatAddress(listing: DiscoveryListing) {
  return (
    [
      listing.address.barangay,
      listing.address.municipality,
      listing.address.province,
    ]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function fallbackListingImage(listing: DiscoveryListing, index: number) {
  const municipality = listing.address.municipality?.toLowerCase() ?? "";

  if (municipality.includes("davao")) {
    return "/homepage-concepts/shared-photography/davao-sunset-desktop.webp";
  }

  return index % 2 === 0
    ? "/homepage-concepts/shared-photography/samal-shore-desktop.webp"
    : "/homepage-concepts/shared-photography/samal-dock-desktop.webp";
}

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BusFront,
  Clock3,
  MapPin,
  Search,
  Ship,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { KinabuhiIndexNavigator } from "@/components/homepage-concepts/kinabuhi-index-navigator";
import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import type {
  DiscoveryCollection,
  DiscoveryListing,
} from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

const KINABUHI_PALETTE = {
  "--kinabuhi-paper": "#F3E9D8",
  "--kinabuhi-ink": "#17192B",
  "--kinabuhi-coral": "#E55A45",
  "--kinabuhi-mangrove": "#337565",
  "--kinabuhi-gold": "#D3A632",
} as CSSProperties;

const CATEGORY_CHAPTERS: Array<{
  category: DiscoveryListing["category"];
  number: string;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    category: "resort",
    number: "01",
    eyebrow: "Coast & pause",
    title: "Resorts",
    description:
      "Shoreline stays, day-use hideaways, and places made for slowing down.",
  },
  {
    category: "room",
    number: "02",
    eyebrow: "A room in the city",
    title: "Rooms & stays",
    description:
      "Useful bases for early flights, late dinners, and another day in town.",
  },
  {
    category: "restaurant",
    number: "03",
    eyebrow: "Table & market",
    title: "Food & drink",
    description:
      "Local signatures, neighborhood tables, and something worth crossing town for.",
  },
  {
    category: "activity",
    number: "04",
    eyebrow: "Out in the day",
    title: "Things to do",
    description:
      "Water, movement, and small adventures that turn a stop into a story.",
  },
  {
    category: "service",
    number: "05",
    eyebrow: "The useful layer",
    title: "Local services",
    description:
      "The practical people and places that help a day move with less friction.",
  },
];

const GUIDE_FALLBACKS = [
  "/homepage-concepts/shared-photography/davao-aerial-desktop.webp",
  "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
] as const;

const TICKET_COLORS = [
  "bg-[#F3E9D8] text-[#17192B]",
  "bg-[#D3A632] text-[#17192B]",
  "bg-[#E55A45] text-[#17192B]",
  "bg-[#F3E9D8] text-[#17192B]",
] as const;

type KinabuhiIndexProps = {
  data: ConceptHomeData;
  fontClassName?: string;
};

export function KinabuhiIndex({
  data,
  fontClassName = "",
}: KinabuhiIndexProps) {
  const listings = data.listings.slice(0, 6);
  const collections = data.collections.slice(0, 2);

  return (
    <div
      className={`${fontClassName} min-h-screen overflow-x-clip bg-[var(--kinabuhi-paper)] text-[var(--kinabuhi-ink)] selection:bg-[var(--kinabuhi-coral)] selection:text-[var(--kinabuhi-paper)] [font-family:var(--font-kinabuhi-sans)]`}
      style={KINABUHI_PALETTE}
    >
      <a
        className="fixed left-3 top-3 z-[60] inline-flex min-h-11 -translate-y-24 items-center bg-[#17192B] px-4 text-sm font-extrabold text-[#F3E9D8] outline-none transition-transform focus:translate-y-0 focus-visible:ring-4 focus-visible:ring-[#D3A632] motion-reduce:transition-none"
        href="#main-content"
      >
        Skip to the local index
      </a>

      <KinabuhiHeader firstCollection={collections[0]} />

      <main id="main-content">
        <KinabuhiHero collections={collections} />
        <GuideLedger collections={collections} />
        <CategoryChapters listings={listings} />

        <section
          aria-labelledby="kinabuhi-places-title"
          className="bg-[#E9DDCA] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
        >
          <div className="mx-auto max-w-[1380px]">
            <div className="grid gap-7 border-b border-[#17192B]/25 pb-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)] lg:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#337565]">
                  The place index
                </p>
                <h2
                  className="mt-3 max-w-4xl text-[clamp(3rem,6vw,6.25rem)] font-semibold leading-[0.86] tracking-[-0.055em] [font-family:var(--font-kinabuhi-editorial)]"
                  id="kinabuhi-places-title"
                >
                  One entry at a time.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-[#17192B]/68 sm:text-base sm:leading-8 lg:justify-self-end">
                Move through the current local edit by photograph, then open the
                place profile for prices, details, and ways to make contact.
              </p>
            </div>

            <div className="mt-10 sm:mt-12">
              <KinabuhiIndexNavigator listings={listings} />
            </div>
          </div>
        </section>

        <TransportRouteStrip ferries={data.ferries} routes={data.routes} />
        <OwnerCallout />
      </main>

      <KinabuhiFooter firstCollection={collections[0]} />
    </div>
  );
}

function KinabuhiHeader({
  firstCollection,
}: {
  firstCollection?: DiscoveryCollection;
}) {
  const guideHref = firstCollection
    ? `/collections/${firstCollection.slug}`
    : "/search";

  return (
    <header className="sticky top-0 z-50 border-b border-[#17192B] bg-[#F3E9D8]/95 backdrop-blur-xl">
      <nav
        aria-label="Kinabuhi Index navigation"
        className="mx-auto flex min-h-[4.75rem] max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12"
      >
        <Link
          aria-current="page"
          className="inline-flex min-h-11 min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#E55A45] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F3E9D8]"
          href="/homepage-concepts/kinabuhi-index"
        >
          <span className="text-sm font-extrabold tracking-[0.12em]">
            PASADYA
          </span>
          <span aria-hidden="true" className="h-7 w-px bg-[#17192B]/35" />
          <span className="truncate text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[#337565]">
            Kinabuhi Index
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link className={headerLinkClass} href={guideHref}>
            Guides
          </Link>
          <Link className={headerLinkClass} href="/search">
            Places
          </Link>
          <Link className={headerLinkClass} href="/transport">
            Ways there
          </Link>
          <Link className={headerLinkClass} href="/homepage-concepts">
            All concepts
          </Link>
        </div>

        <Link
          aria-label="Search all places"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center bg-[#17192B] text-[#F3E9D8] outline-none transition-colors hover:bg-[#337565] focus-visible:ring-4 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3E9D8] motion-reduce:transition-none md:hidden"
          href="/search"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </Link>
      </nav>
    </header>
  );
}

const headerLinkClass =
  "inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors hover:border-[#E55A45] hover:text-[#337565] focus-visible:ring-2 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3E9D8] motion-reduce:transition-none";

function KinabuhiHero({ collections }: { collections: DiscoveryCollection[] }) {
  const primaryCollection = collections[0];
  const secondaryCollection = collections[1];
  const primaryHref = primaryCollection
    ? `/collections/${primaryCollection.slug}`
    : "/search?area=davao-city";
  const secondaryHref = secondaryCollection
    ? `/collections/${secondaryCollection.slug}`
    : "/search?category=restaurant";

  return (
    <section
      aria-labelledby="kinabuhi-title"
      className="border-b border-[#17192B]"
    >
      <div className="mx-auto grid max-w-[1500px] lg:min-h-[calc(100svh-4.75rem)] lg:grid-cols-12">
        <div className="flex flex-col justify-center border-b border-[#17192B] px-5 py-12 sm:px-8 sm:py-16 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-12 lg:py-20">
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#337565]">
            <span className="h-2.5 w-2.5 bg-[#E55A45]" />
            Davao City + Samal Island
          </p>
          <h1
            className="mt-6 max-w-3xl text-[clamp(3.6rem,7vw,7.6rem)] font-semibold leading-[0.78] tracking-[-0.065em] [font-family:var(--font-kinabuhi-editorial)]"
            id="kinabuhi-title"
          >
            A living index of place.
          </h1>

          <DirectSearch />

          <p className="mt-7 max-w-xl text-base leading-7 text-[#17192B]/70 sm:text-lg sm:leading-8">
            Begin with local character, follow the photograph, then find the
            table, shore, room, or route that fits the day.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#17192B]/20 pt-5 text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-[#17192B]/58">
            <span>Edition 01</span>
            <span>{collections.length} local guides</span>
            <span>Culture · coast · city</span>
          </div>
        </div>

        <div className="grid min-h-[38rem] grid-cols-7 grid-rows-[minmax(25rem,1fr)_13rem] gap-px bg-[#17192B] p-px sm:min-h-[45rem] lg:col-span-7 lg:min-h-full">
          <Link
            className="group relative col-span-7 overflow-hidden bg-[#337565] outline-none focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#D3A632]"
            href={primaryHref}
          >
            <ResponsiveHeroArt
              className="transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none"
              desktopMedia="(min-width: 640px)"
              desktopSizes="(min-width: 1024px) 58vw, 100vw"
              desktopSrc="/homepage-concepts/shared-photography/davao-aerial-desktop.webp"
              mobileSrc="/homepage-concepts/shared-photography/davao-aerial-mobile.webp"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17192B]/85 via-[#17192B]/5 to-[#17192B]/10" />
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-5 text-[#F3E9D8] sm:inset-x-8 sm:bottom-8">
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[#D3A632]">
                  Cover story · Guide 01
                </p>
                <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-[0.95] tracking-[-0.035em] sm:text-5xl [font-family:var(--font-kinabuhi-editorial)]">
                  {primaryCollection?.title ?? "See the city as one living map"}
                </h2>
              </div>
              <ArrowUpRight
                aria-hidden="true"
                className="h-8 w-8 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </div>
          </Link>

          <Link
            className="group relative col-span-4 overflow-hidden bg-[#E55A45] outline-none focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#D3A632]"
            href={secondaryHref}
          >
            <ResponsiveHeroArt
              className="transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
              desktopMedia="(min-width: 640px)"
              desktopSizes="(min-width: 1024px) 33vw, 58vw"
              desktopSrc="/homepage-concepts/shared-photography/davao-durian-desktop.webp"
              mobileSizes="58vw"
              mobileSrc="/homepage-concepts/shared-photography/davao-durian-mobile.webp"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17192B]/80 via-transparent to-transparent" />
            <p className="absolute inset-x-4 bottom-4 text-sm font-extrabold leading-5 text-[#F3E9D8] sm:inset-x-5 sm:bottom-5">
              {secondaryCollection?.title ?? "Market signatures of Davao"}
            </p>
          </Link>

          <div className="col-span-3 flex flex-col justify-between bg-[#D3A632] p-4 sm:p-6">
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em]">
              Kinabuhi / life
            </p>
            <p className="text-xl font-semibold leading-[0.95] tracking-[-0.025em] sm:text-3xl [font-family:var(--font-kinabuhi-editorial)]">
              Know the character. Find your way in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DirectSearch() {
  return (
    <form
      action="/search"
      className="mt-7 border border-[#17192B] bg-[#17192B] p-2 text-[#F3E9D8] shadow-[7px_7px_0_#E55A45]"
      method="get"
      role="search"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 xl:grid-cols-[minmax(0,1fr)_9.5rem_auto] xl:items-end">
        <label className="col-span-2 grid min-w-0 gap-1.5 p-1 text-[0.62rem] font-extrabold uppercase tracking-[0.16em] xl:col-span-1">
          Search the index
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#337565]"
            />
            <input
              autoComplete="off"
              className="min-h-12 w-full border border-transparent bg-[#F3E9D8] py-3 pl-11 pr-4 text-base font-semibold normal-case tracking-normal text-[#17192B] outline-none placeholder:text-[#17192B]/50 focus-visible:border-[#D3A632] focus-visible:ring-2 focus-visible:ring-[#D3A632]"
              name="q"
              placeholder="A beach, table, room…"
              spellCheck={false}
              type="search"
            />
          </span>
        </label>

        <label className="grid gap-1.5 p-1 text-[0.62rem] font-extrabold uppercase tracking-[0.16em]">
          Area
          <select
            className="min-h-12 w-full border border-transparent bg-[#F3E9D8] px-3 text-sm font-semibold normal-case tracking-normal text-[#17192B] outline-none focus-visible:border-[#D3A632] focus-visible:ring-2 focus-visible:ring-[#D3A632]"
            defaultValue=""
            name="area"
          >
            <option value="">Davao + Samal</option>
            <option value="davao-city">Davao City</option>
            <option value="samal">Samal Island</option>
          </select>
        </label>

        <button
          className="m-1 inline-flex min-h-12 items-center justify-center gap-2 bg-[#D3A632] px-5 text-sm font-extrabold text-[#17192B] outline-none transition-colors hover:bg-[#F3E9D8] focus-visible:ring-2 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17192B] motion-reduce:transition-none"
          type="submit"
        >
          Find it
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function GuideLedger({ collections }: { collections: DiscoveryCollection[] }) {
  return (
    <section
      aria-labelledby="kinabuhi-guides-title"
      className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
    >
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-7 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#E55A45]">
              Guides / local character
            </p>
            <h2
              className="mt-3 max-w-5xl text-[clamp(3rem,6.2vw,6.5rem)] font-semibold leading-[0.84] tracking-[-0.055em] [font-family:var(--font-kinabuhi-editorial)]"
              id="kinabuhi-guides-title"
            >
              Read the place before choosing the stop.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[#17192B]/65 lg:col-span-4 lg:justify-self-end">
            Short, considered collections for entering a neighborhood through
            its mood, appetite, and pace—not only a pin on a map.
          </p>
        </div>

        {collections.length > 0 ? (
          <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-8">
            {collections.map((collection, index) => (
              <Link
                className={`group relative grid overflow-hidden bg-[#17192B] text-[#F3E9D8] outline-none focus-visible:ring-4 focus-visible:ring-[#E55A45] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F3E9D8] ${
                  index === 0
                    ? "min-h-[34rem] lg:col-span-7 lg:min-h-[43rem]"
                    : "min-h-[30rem] lg:col-span-5 lg:mt-24 lg:min-h-[36rem]"
                }`}
                href={`/collections/${collection.slug}`}
                key={collection.id}
              >
                <Image
                  alt=""
                  className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
                  fill
                  sizes={
                    index === 0
                      ? "(min-width: 1024px) 58vw, 100vw"
                      : "(min-width: 1024px) 42vw, 100vw"
                  }
                  src={
                    collection.coverImage ??
                    GUIDE_FALLBACKS[index % GUIDE_FALLBACKS.length]
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17192B] via-[#17192B]/15 to-[#17192B]/5" />
                <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-9">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`inline-flex min-h-11 items-center px-4 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#17192B] ${
                        index === 0 ? "bg-[#D3A632]" : "bg-[#E55A45]"
                      }`}
                    >
                      Guide {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.13em] text-[#F3E9D8]/72">
                      {collection.listingIds.length}{" "}
                      {collection.listingIds.length === 1 ? "place" : "places"}
                    </span>
                  </div>

                  <div>
                    <h3 className="max-w-3xl text-4xl font-semibold leading-[0.9] tracking-[-0.04em] sm:text-6xl [font-family:var(--font-kinabuhi-editorial)]">
                      {collection.title}
                    </h3>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-[#F3E9D8]/72">
                      {collection.description}
                    </p>
                    <span className="mt-7 inline-flex min-h-11 items-center gap-3 border-b border-[#F3E9D8] text-sm font-extrabold">
                      Open the collection
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
                      />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid min-h-[24rem] place-items-center border border-dashed border-[#17192B]/45 bg-[#E9DDCA] p-7 text-center sm:p-12">
            <div className="max-w-xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#337565]">
                The guide desk is editing
              </p>
              <h3 className="mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.04em] sm:text-5xl [font-family:var(--font-kinabuhi-editorial)]">
                New neighborhood collections are on the way.
              </h3>
              <Link
                className="mt-7 inline-flex min-h-12 items-center gap-3 bg-[#17192B] px-5 text-sm font-extrabold text-[#F3E9D8] outline-none focus-visible:ring-4 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2"
                href="/search"
              >
                Browse every place
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CategoryChapters({ listings }: { listings: DiscoveryListing[] }) {
  return (
    <section
      aria-labelledby="kinabuhi-chapters-title"
      className="border-y border-[#17192B] bg-[#D3A632]"
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-6 border-b border-[#17192B] px-5 py-12 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-16">
          <div className="lg:col-span-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em]">
              Category chapters
            </p>
            <h2
              className="mt-3 text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.84] tracking-[-0.055em] [font-family:var(--font-kinabuhi-editorial)]"
              id="kinabuhi-chapters-title"
            >
              Five ways into the day.
            </h2>
          </div>
          <p className="max-w-md self-end text-sm leading-7 text-[#17192B]/70 lg:col-span-4 lg:justify-self-end">
            Browse by what the day needs, or jump directly to one current entry
            from each chapter.
          </p>
        </div>

        <ol className="divide-y divide-[#17192B]">
          {CATEGORY_CHAPTERS.map((chapter) => {
            const matches = listings.filter(
              (listing) => listing.category === chapter.category,
            );
            const featured = matches[0];

            return (
              <li
                className="group grid gap-5 px-5 py-8 transition-colors hover:bg-[#F3E9D8] motion-reduce:transition-none sm:px-8 lg:grid-cols-12 lg:items-center lg:px-12 lg:py-9"
                key={chapter.category}
              >
                <p className="text-5xl font-semibold leading-none tracking-[-0.04em] text-[#17192B]/25 lg:col-span-1 [font-family:var(--font-kinabuhi-editorial)]">
                  {chapter.number}
                </p>
                <div className="lg:col-span-3">
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#337565]">
                    {chapter.eyebrow}
                  </p>
                  <h3 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl [font-family:var(--font-kinabuhi-editorial)]">
                    {chapter.title}
                  </h3>
                </div>
                <p className="max-w-xl text-sm leading-7 text-[#17192B]/68 lg:col-span-4">
                  {chapter.description}
                </p>
                <div className="flex flex-col items-start gap-2 lg:col-span-4 lg:items-end">
                  <Link
                    className="inline-flex min-h-11 items-center gap-3 text-sm font-extrabold outline-none underline decoration-[#E55A45] decoration-2 underline-offset-8 focus-visible:ring-2 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2"
                    href={`/search?category=${chapter.category}`}
                  >
                    Open chapter · {matches.length}{" "}
                    {matches.length === 1 ? "entry" : "entries"}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  {featured ? (
                    <Link
                      className="inline-flex min-h-11 max-w-full items-center gap-2 text-left text-xs font-bold text-[#17192B]/65 outline-none transition-colors hover:text-[#337565] focus-visible:ring-2 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2 motion-reduce:transition-none lg:text-right"
                      href={`/place/${featured.slug}`}
                    >
                      Current entry:{" "}
                      <span className="truncate">{featured.name}</span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0"
                      />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function TransportRouteStrip({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const visibleRoutes = routes.slice(0, 4);
  const visibleFerries = ferries.slice(0, 2);
  const hasTransport = visibleRoutes.length > 0 || visibleFerries.length > 0;

  return (
    <section
      aria-labelledby="kinabuhi-transport-title"
      className="relative overflow-hidden bg-[#337565] py-16 text-[#F3E9D8] sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-[52%] border-t-2 border-dashed border-[#F3E9D8]/25"
      />
      <div className="relative mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-7 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#D3A632]">
              The route strip
            </p>
            <h2
              className="mt-3 max-w-5xl text-[clamp(3rem,6.2vw,6.4rem)] font-semibold leading-[0.84] tracking-[-0.055em] [font-family:var(--font-kinabuhi-editorial)]"
              id="kinabuhi-transport-title"
            >
              The way there belongs in the story.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <p className="max-w-md text-sm leading-7 text-[#F3E9D8]/70">
              Published city routes and gulf crossings in one tactile read.
              Confirm current times and fares with local operators before
              leaving.
            </p>
            <Link
              className="mt-5 inline-flex min-h-12 items-center gap-3 border border-[#F3E9D8] px-5 text-sm font-extrabold outline-none transition-colors hover:bg-[#F3E9D8] hover:text-[#17192B] focus-visible:ring-4 focus-visible:ring-[#D3A632] focus-visible:ring-offset-2 focus-visible:ring-offset-[#337565] motion-reduce:transition-none"
              href="/transport"
            >
              Open the full route guide
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {hasTransport ? (
        <div
          aria-label="Selected local transport routes"
          className="relative mt-12 flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-8 sm:mt-14 sm:gap-5 sm:px-8 lg:px-[max(3rem,calc((100vw-1500px)/2+3rem))] [scrollbar-color:#D3A632_#337565] [scrollbar-width:thin]"
        >
          {visibleFerries.map((ferry, index) => (
            <FerryTicket ferry={ferry} index={index} key={ferry.id} />
          ))}
          {visibleRoutes.map((route, index) => (
            <RouteTicket
              index={index + visibleFerries.length}
              key={route.id}
              route={route}
            />
          ))}
        </div>
      ) : (
        <div className="relative mx-auto mt-12 max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <div className="border border-dashed border-[#F3E9D8]/55 bg-[#17192B]/20 p-7 sm:p-10">
            <p className="text-2xl font-semibold [font-family:var(--font-kinabuhi-editorial)]">
              Route notes are being refreshed.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-extrabold underline decoration-[#D3A632] decoration-2 underline-offset-8 outline-none focus-visible:ring-2 focus-visible:ring-[#D3A632]"
              href="/transport"
            >
              Check the transport guide
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function FerryTicket({
  ferry,
  index,
}: {
  ferry: FerrySchedule;
  index: number;
}) {
  return (
    <Link
      className={`group relative min-h-[23rem] w-[84vw] max-w-[23rem] shrink-0 snap-center overflow-hidden border-2 border-[#17192B] p-6 text-left shadow-[7px_7px_0_#17192B] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#D3A632] focus-visible:ring-offset-4 focus-visible:ring-offset-[#337565] motion-reduce:transform-none motion-reduce:transition-none sm:w-[23rem] ${
        TICKET_COLORS[index % TICKET_COLORS.length]
      }`}
      href="/transport"
    >
      <TicketNotches />
      <div className="flex items-start justify-between gap-5 border-b border-dashed border-[#17192B]/40 pb-5">
        <div>
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em]">
            Gulf crossing · {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-3xl font-semibold leading-[0.95] tracking-[-0.035em] [font-family:var(--font-kinabuhi-editorial)]">
            {ferry.routeName}
          </h3>
        </div>
        <Ship aria-hidden="true" className="h-7 w-7 shrink-0" />
      </div>

      <p className="mt-7 text-xl font-extrabold">
        {ferry.origin}
        <ArrowRight aria-hidden="true" className="mx-2 inline h-4 w-4" />
        {ferry.destination}
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] opacity-55">
            First shown
          </dt>
          <dd className="mt-1.5 inline-flex items-center gap-2 font-extrabold">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            {ferry.departureTimes[0] ?? "Check wharf"}
          </dd>
        </div>
        <div>
          <dt className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] opacity-55">
            Crossing
          </dt>
          <dd className="mt-1.5 font-extrabold">
            {ferry.durationMinutes > 0
              ? `${ferry.durationMinutes} min`
              : "Confirm locally"}
          </dd>
        </div>
      </dl>
      <div className="absolute inset-x-6 bottom-6 flex min-h-11 items-end justify-between gap-4 border-t border-[#17192B]/25 pt-4 text-sm font-extrabold">
        <span>{formatPeso(ferry.fare)}</span>
        <span className="inline-flex items-center gap-2">
          Route details
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
          />
        </span>
      </div>
    </Link>
  );
}

function RouteTicket({
  route,
  index,
}: {
  route: TransportRoute;
  index: number;
}) {
  const origin = route.stops[0]?.name;
  const destination = route.stops[route.stops.length - 1]?.name;

  return (
    <Link
      className={`group relative min-h-[23rem] w-[84vw] max-w-[23rem] shrink-0 snap-center overflow-hidden border-2 border-[#17192B] p-6 text-left shadow-[7px_7px_0_#17192B] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#D3A632] focus-visible:ring-offset-4 focus-visible:ring-offset-[#337565] motion-reduce:transform-none motion-reduce:transition-none sm:w-[23rem] ${
        TICKET_COLORS[index % TICKET_COLORS.length]
      }`}
      href="/transport"
    >
      <TicketNotches />
      <div className="flex items-start justify-between gap-5 border-b border-dashed border-[#17192B]/40 pb-5">
        <div>
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em]">
            {humanizeMode(route.mode)} · {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-3xl font-semibold leading-[0.95] tracking-[-0.035em] [font-family:var(--font-kinabuhi-editorial)]">
            {route.name}
          </h3>
        </div>
        <BusFront aria-hidden="true" className="h-7 w-7 shrink-0" />
      </div>

      <div className="mt-7 flex items-start gap-3 text-sm font-extrabold leading-6">
        <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
        <p>
          {origin && destination
            ? `${origin} → ${destination}`
            : "Open the route guide for stop details"}
        </p>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] opacity-55">
            Stops
          </dt>
          <dd className="mt-1.5 font-extrabold">{route.stops.length}</dd>
        </div>
        <div>
          <dt className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] opacity-55">
            Fare
          </dt>
          <dd className="mt-1.5 font-extrabold">
            {formatFareRange(route.fareMin, route.fareMax)}
          </dd>
        </div>
      </dl>
      <div className="absolute inset-x-6 bottom-6 flex min-h-11 items-end justify-end border-t border-[#17192B]/25 pt-4 text-sm font-extrabold">
        <span className="inline-flex items-center gap-2">
          Route details
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
          />
        </span>
      </div>
    </Link>
  );
}

function TicketNotches() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-[#17192B] bg-[#337565]"
      />
      <span
        aria-hidden="true"
        className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-[#17192B] bg-[#337565]"
      />
    </>
  );
}

function OwnerCallout() {
  return (
    <section
      aria-labelledby="kinabuhi-owner-title"
      className="border-y border-[#17192B] bg-[#E55A45] px-5 py-14 sm:px-8 sm:py-20 lg:px-12"
    >
      <div className="mx-auto grid max-w-[1380px] gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em]">
            For the people behind the place
          </p>
          <h2
            className="mt-3 max-w-5xl text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.84] tracking-[-0.055em] [font-family:var(--font-kinabuhi-editorial)]"
            id="kinabuhi-owner-title"
          >
            Keep your entry true to life.
          </h2>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <p className="max-w-md text-sm leading-7 text-[#17192B]/72">
            Claim your listing to keep details current, answer with confidence,
            and help visitors understand the place before they arrive.
          </p>
          <Link
            className="mt-6 inline-flex min-h-14 items-center gap-3 bg-[#17192B] px-6 text-sm font-extrabold text-[#F3E9D8] shadow-[6px_6px_0_#D3A632] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#F3E9D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E55A45] motion-reduce:transform-none motion-reduce:transition-none"
            href="/portal/claims/new"
          >
            Claim your listing
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function KinabuhiFooter({
  firstCollection,
}: {
  firstCollection?: DiscoveryCollection;
}) {
  const guideLinks: Array<[string, string]> = [
    ["All places", "/search"],
    ["Transport guide", "/transport"],
  ];

  if (firstCollection) {
    guideLinks.unshift([
      firstCollection.title,
      `/collections/${firstCollection.slug}`,
    ]);
  }

  return (
    <footer className="bg-[#17192B] px-5 pb-12 pt-14 text-[#F3E9D8] sm:px-8 sm:pt-20 lg:px-12">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-12 border-b border-[#F3E9D8]/20 pb-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Link
              className="inline-flex min-h-11 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#D3A632] focus-visible:ring-offset-4 focus-visible:ring-offset-[#17192B]"
              href="/homepage-concepts/kinabuhi-index"
            >
              <span className="text-sm font-extrabold tracking-[0.12em]">
                PASADYA
              </span>
              <span aria-hidden="true" className="h-7 w-px bg-[#F3E9D8]/35" />
              <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[#D3A632]">
                Kinabuhi Index
              </span>
            </Link>
            <p className="mt-6 max-w-md text-2xl font-semibold leading-8 text-[#F3E9D8]/78 [font-family:var(--font-kinabuhi-editorial)]">
              A local index of character, places, and the ways between them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterColumn links={guideLinks} title="Read" />
            <FooterColumn
              links={[
                ["Search", "/search"],
                ["Claim a listing", "/portal/claims/new"],
              ]}
              title="Take part"
            />
            <FooterColumn
              links={[
                ["All concepts", "/homepage-concepts"],
                ["Privacy", "/legal/privacy"],
                ["Terms", "/legal/terms"],
              ]}
              title="Pasadya"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-xs text-[#F3E9D8]/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Pasadya · Davao City + Samal Island</p>
          <p>Kinabuhi Index · Private homepage preview</p>
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
  links: Array<[string, string]>;
}) {
  return (
    <nav aria-label={`${title} footer links`}>
      <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#D3A632]">
        {title}
      </p>
      <ul className="mt-4 space-y-1">
        {links.map(([label, href]) => (
          <li key={`${label}-${href}`}>
            <Link
              className="inline-flex min-h-11 min-w-11 items-center text-sm text-[#F3E9D8]/68 outline-none transition-colors hover:text-[#F3E9D8] focus-visible:ring-2 focus-visible:ring-[#D3A632] motion-reduce:transition-none"
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

function humanizeMode(mode: TransportRoute["mode"]) {
  return mode
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPeso(value: number | null) {
  if (value === null) return "Check fare";
  return `₱${(value / 100).toLocaleString("en-PH")}`;
}

function formatFareRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "Check fare";
  if (min === null) return formatPeso(max);
  if (max === null || min === max) return formatPeso(min);
  return `${formatPeso(min)}–${formatPeso(max).replace(/^₱/, "")}`;
}

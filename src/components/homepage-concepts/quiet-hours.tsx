import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BusFront,
  Compass,
  MapPin,
  Route,
  Ship,
  Sparkles,
  Store,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { QuietHoursDial } from "@/components/homepage-concepts/quiet-hours-dial";
import type {
  DiscoveryCollection,
  DiscoveryListing,
  ListingCategory,
} from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  resort: "Resort",
  room: "Stay",
  restaurant: "Food",
  activity: "Activity",
  service: "Service",
};

const CATEGORY_LINKS = [
  ["Resorts", "/search?category=resort"],
  ["Rooms", "/search?category=room"],
  ["Food", "/search?category=restaurant"],
  ["Activities", "/search?category=activity"],
  ["Services", "/search?category=service"],
] as const;

const PLACE_FALLBACKS = [
  "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
  "/homepage-concepts/shared-photography/davao-sunset-desktop.webp",
] as const;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function QuietHours({
  data,
  fontClassName = "",
}: {
  data: ConceptHomeData;
  fontClassName?: string;
}) {
  const listings = (
    data.listings.length ? data.listings : data.featuredListings
  ).slice(0, 6);

  return (
    <div
      className={`${fontClassName} qh-page min-h-screen overflow-x-clip bg-[#F8F2E7] text-[#0B1735] selection:bg-[#1748C8] selection:text-white [font-family:var(--font-quiet-hours-body)]`}
    >
      <QuietHoursHeader />

      <main id="main-content">
        <QuietHoursDial listings={listings} />
        <CompactPlaces listings={listings} />
        <TransportTimeline ferries={data.ferries} routes={data.routes} />
        <QuietGuides collections={data.collections} />
        <OwnerInvitation />
      </main>

      <QuietHoursFooter />
      <style>{quietHoursStyles}</style>
    </div>
  );
}

function QuietHoursHeader() {
  return (
    <header className="relative z-50 border-b border-[#0B1735]/15 bg-[#F8F2E7]/95 backdrop-blur-xl">
      <nav
        aria-label="Quiet Hours navigation"
        className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12"
      >
        <Link
          className="group inline-flex min-h-11 items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#1748C8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F8F2E7]"
          href="/homepage-concepts"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0B1735] text-xl font-semibold italic text-[#FF8979] [font-family:var(--font-quiet-hours-display)]">
            P
          </span>
          <span>
            <span className="block text-base font-extrabold leading-none tracking-[-0.035em]">
              Pasadya
            </span>
            <span className="mt-1 block text-[0.58rem] font-extrabold uppercase tracking-[0.19em] text-[#5D6170]">
              Quiet Hours
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <HeaderLink href="/search">Find places</HeaderLink>
          <HeaderLink href="/transport">Plan the way</HeaderLink>
          <HeaderLink href="/homepage-concepts">Concept gallery</HeaderLink>
        </div>

        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1748C8] px-4 text-sm font-extrabold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1748C8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F8F2E7] md:hidden"
          href="/search"
        >
          Explore
          <Compass aria-hidden="true" className="h-4 w-4" />
        </Link>
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
      className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-[#454B60] outline-none transition-colors hover:bg-[#E8E6FF] hover:text-[#10265F] focus-visible:ring-2 focus-visible:ring-[#1748C8] motion-reduce:transition-none"
      href={href}
    >
      {children}
    </Link>
  );
}

function CompactPlaces({ listings }: { listings: DiscoveryListing[] }) {
  const places = listings.slice(0, 4);

  return (
    <section
      aria-labelledby="quiet-places-title"
      className="bg-[#F8F2E7] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-7 border-t border-[#0B1735]/20 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.67rem] font-extrabold uppercase tracking-[0.2em] text-[#1748C8]">
              A short, considered list
            </p>
            <h2
              className="mt-3 max-w-3xl text-[clamp(2.9rem,6vw,6rem)] font-medium leading-[0.84] tracking-[-0.05em] [font-family:var(--font-quiet-hours-display)]"
              id="quiet-places-title"
            >
              Places worth making room for.
            </h2>
          </div>

          <nav
            aria-label="Browse place categories"
            className="flex max-w-2xl snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] lg:justify-end [&::-webkit-scrollbar]:hidden"
          >
            {CATEGORY_LINKS.map(([label, href]) => (
              <Link
                className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border border-[#0B1735]/20 bg-white/55 px-4 text-sm font-bold outline-none transition-colors hover:border-[#1748C8] hover:bg-[#E8E6FF] focus-visible:ring-2 focus-visible:ring-[#1748C8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F2E7] motion-reduce:transition-none"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {places.length > 0 ? (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {places.map((listing, index) => (
              <PlaceCard index={index} key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-[1.75rem] border border-[#0B1735]/15 bg-white/55 p-7 sm:p-10">
            <MapPin aria-hidden="true" className="h-7 w-7 text-[#E05C52]" />
            <h3 className="mt-5 text-3xl font-medium [font-family:var(--font-quiet-hours-display)]">
              The next local edit is taking shape.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#5D6170]">
              Browse the directory for every currently published place.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1748C8] px-5 text-sm font-extrabold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1748C8] focus-visible:ring-offset-4"
              href="/search"
            >
              Search all places
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function PlaceCard({
  listing,
  index,
}: {
  listing: DiscoveryListing;
  index: number;
}) {
  const media = listing.media[0];
  const location = listingLocation(listing);

  return (
    <article className="group">
      <Link
        className="block h-full overflow-hidden rounded-[1.5rem] border border-[#0B1735]/15 bg-[#FFFDF8] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#1748C8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F8F2E7] motion-reduce:transform-none motion-reduce:transition-none"
        href={`/place/${listing.slug}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#D7D8FF]">
          <Image
            alt={
              media?.caption ??
              `${listing.name}, a published place in ${location}`
            }
            className="object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
            fill
            loading="lazy"
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            src={media?.url ?? PLACE_FALLBACKS[index % PLACE_FALLBACKS.length]}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1735]/45 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-[#FFFDF8]/95 px-3 py-2 text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[#10265F] backdrop-blur">
            {CATEGORY_LABELS[listing.category]}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold leading-tight tracking-[-0.035em]">
                {listing.name}
              </h3>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#5D6170]">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                {location}
              </p>
            </div>
            <ArrowUpRight
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 text-[#1748C8] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            />
          </div>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#5D6170]">
            {listing.description}
          </p>
          <p className="mt-4 border-t border-[#0B1735]/10 pt-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#10265F]">
            {listing.priceMin !== null
              ? `From ${formatPrice(listing.priceMin)}`
              : "Open place details"}
          </p>
        </div>
      </Link>
    </article>
  );
}

type TimelineEntry = {
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  icon: typeof Route;
};

function TransportTimeline({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const landRoutes = routes.filter((route) => route.mode !== "ferry");
  const firstRoute = landRoutes[0] ?? routes[0];
  const secondRoute =
    landRoutes.find((route) => route.id !== firstRoute?.id) ??
    routes.find((route) => route.id !== firstRoute?.id);
  const ferry = ferries[0];
  const entries: TimelineEntry[] = [];

  if (firstRoute) {
    entries.push({
      id: firstRoute.id,
      eyebrow: "Published local route",
      title: firstRoute.name,
      meta: `${humanizeMode(firstRoute.mode)} · ${firstRoute.stops.length} listed stops · ${formatRouteFare(firstRoute)}`,
      icon: BusFront,
    });
  }

  if (ferry) {
    entries.push({
      id: ferry.id,
      eyebrow: "Ferry reference",
      title: `${ferry.origin} → ${ferry.destination}`,
      meta: `${ferry.durationMinutes > 0 ? `${ferry.durationMinutes} min published duration` : "Confirm duration"} · ${formatPrice(ferry.fare)}`,
      icon: Ship,
    });
  }

  if (secondRoute) {
    entries.push({
      id: secondRoute.id,
      eyebrow: "Another route to compare",
      title: secondRoute.name,
      meta: `${humanizeMode(secondRoute.mode)} · ${secondRoute.stops.length} listed stops · ${formatRouteFare(secondRoute)}`,
      icon: Route,
    });
  }

  return (
    <section
      aria-labelledby="quiet-transport-title"
      className="relative overflow-hidden bg-[#0B1735] px-5 py-16 text-[#FFF4E8] sm:px-8 sm:py-20 lg:px-12 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#FF806F]/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.55fr)] lg:items-end">
          <div>
            <p className="text-[0.67rem] font-extrabold uppercase tracking-[0.2em] text-[#FF9587]">
              The in-between, made legible
            </p>
            <h2
              className="mt-3 max-w-4xl text-[clamp(3rem,6vw,6.25rem)] font-medium leading-[0.84] tracking-[-0.05em] [font-family:var(--font-quiet-hours-display)]"
              id="quiet-transport-title"
            >
              Keep the way as calm as the stay.
            </h2>
          </div>
          <div>
            <p className="text-sm leading-6 text-[#CFD3DF]">
              Published transport references for comparison—not a connected
              itinerary, live departure board, opening-hours claim, or
              availability signal. Confirm details with operators before travel.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#FF9587] outline-none underline decoration-[#FF9587]/35 underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#FF9587]"
              href="/transport"
            >
              Open the transport guide
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {entries.length > 0 ? (
          <ol className="relative mt-10 grid gap-3 border-l border-[#FFF4E8]/20 pl-5 md:grid-cols-3 md:border-l-0 md:border-t md:pl-0 md:pt-6">
            {entries.map((entry, index) => {
              const Icon = entry.icon;

              return (
                <li className="relative" key={`${entry.id}-${index}`}>
                  <span
                    aria-hidden="true"
                    className="absolute -left-[1.57rem] top-7 h-3 w-3 rounded-full border-2 border-[#0B1735] bg-[#FF806F] ring-1 ring-[#FFF4E8]/30 md:-top-[1.9rem] md:left-7"
                  />
                  <Link
                    className="group flex min-h-[12rem] h-full flex-col justify-between rounded-[1.5rem] border border-[#FFF4E8]/15 bg-[#14264D] p-5 outline-none transition-colors hover:border-[#FF9587]/70 hover:bg-[#192D58] focus-visible:ring-2 focus-visible:ring-[#FF9587] motion-reduce:transition-none sm:p-6"
                    href="/transport"
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FF806F] text-[#25182D]">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="text-[0.65rem] font-extrabold tracking-[0.18em] text-[#9CA8C2]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span>
                      <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[#FF9587]">
                        {entry.eyebrow}
                      </span>
                      <span className="mt-2 block text-xl font-extrabold leading-snug">
                        {entry.title}
                      </span>
                      <span className="mt-3 block text-xs font-semibold leading-5 text-[#CFD3DF]">
                        {entry.meta}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-10 rounded-[1.5rem] border border-[#FFF4E8]/15 bg-[#14264D] p-7">
            <Route aria-hidden="true" className="h-7 w-7 text-[#FF9587]" />
            <h3 className="mt-4 text-2xl font-extrabold">
              Transport references are being refreshed.
            </h3>
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FF806F] px-5 text-sm font-extrabold text-[#25182D] outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/transport"
            >
              Check the full guide
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function QuietGuides({ collections }: { collections: DiscoveryCollection[] }) {
  const guides = collections.slice(0, 2);

  return (
    <section
      aria-labelledby="quiet-guides-title"
      className="bg-[#E8E6FF] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.67rem] font-extrabold uppercase tracking-[0.2em] text-[#1748C8]">
              Guides for going slowly
            </p>
            <h2
              className="mt-3 max-w-4xl text-[clamp(3rem,6vw,6.25rem)] font-medium leading-[0.84] tracking-[-0.05em] [font-family:var(--font-quiet-hours-display)]"
              id="quiet-guides-title"
            >
              A whole day, already considered.
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#1748C8] outline-none underline decoration-[#1748C8]/30 underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#1748C8]"
            href="/search"
          >
            Browse every place
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {guides.length > 0 ? (
          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            {guides.map((collection, index) => (
              <GuideCard
                collection={collection}
                index={index}
                key={collection.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-[1.75rem] border border-[#10265F]/15 bg-[#F8F7FF] p-7 sm:p-10">
            <Sparkles aria-hidden="true" className="h-7 w-7 text-[#1748C8]" />
            <h3 className="mt-4 text-3xl font-medium [font-family:var(--font-quiet-hours-display)]">
              New collections will appear here.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#505A70]">
              Search the published directory while the next local guide is
              assembled.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function GuideCard({
  collection,
  index,
}: {
  collection: DiscoveryCollection;
  index: number;
}) {
  return (
    <Link
      className="group grid min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-[#10265F]/15 bg-[#F8F7FF] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#1748C8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#E8E6FF] motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[minmax(12rem,.86fr)_minmax(0,1.14fr)]"
      href={`/collections/${collection.slug}`}
    >
      <span className="relative min-h-56 overflow-hidden bg-[#10265F] sm:min-h-full">
        <Image
          alt=""
          className="object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
          fill
          loading="lazy"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 42vw, 100vw"
          src={
            collection.coverImage ??
            PLACE_FALLBACKS[(index + 1) % PLACE_FALLBACKS.length]
          }
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#0B1735] px-3 py-2 text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-[#FFF4E8]">
          Collection {String(index + 1).padStart(2, "0")}
        </span>
      </span>
      <span className="flex flex-col justify-between p-6 sm:p-7">
        <span>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#D7D8FF] text-[#1748C8]">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="mt-6 block text-3xl font-medium leading-[0.98] tracking-[-0.03em] [font-family:var(--font-quiet-hours-display)] sm:text-4xl">
            {collection.title}
          </span>
          <span className="mt-4 line-clamp-3 block text-sm leading-6 text-[#505A70]">
            {collection.description}
          </span>
        </span>
        <span className="mt-7 flex min-h-11 items-center justify-between gap-4 border-t border-[#10265F]/12 pt-4 text-sm font-extrabold text-[#1748C8]">
          {collection.listingIds.length} places in this guide
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          />
        </span>
      </span>
    </Link>
  );
}

function OwnerInvitation() {
  return (
    <section
      aria-labelledby="quiet-owner-title"
      className="bg-[#FF8F7F] px-5 py-14 text-[#0B1735] sm:px-8 sm:py-16 lg:px-12 lg:py-20"
    >
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)] lg:items-end">
        <div>
          <p className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0B1735]/20 px-4 text-[0.65rem] font-extrabold uppercase tracking-[0.18em]">
            <Store aria-hidden="true" className="h-4 w-4" />
            For local owners
          </p>
          <h2
            className="mt-4 max-w-4xl text-[clamp(3rem,6vw,6.4rem)] font-medium leading-[0.82] tracking-[-0.05em] [font-family:var(--font-quiet-hours-display)]"
            id="quiet-owner-title"
          >
            Put your place in the right chapter.
          </h2>
        </div>
        <div>
          <p className="text-base font-semibold leading-7 text-[#27314D]">
            Claim your listing to present useful details clearly to people
            planning a Davao or Samal day.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0B1735] px-6 text-sm font-extrabold text-white outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0B1735] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FF8F7F] motion-reduce:transform-none motion-reduce:transition-none"
              href="/portal/claims/new"
            >
              Claim a listing
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center rounded-full border border-[#0B1735]/30 px-6 text-sm font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-[#0B1735] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FF8F7F]"
              href="/homepage-concepts"
            >
              View concepts
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuietHoursFooter() {
  return (
    <footer className="bg-[#F8F2E7] px-5 pb-8 pt-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1440px] border-t border-[#0B1735]/18 pt-7">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-2xl font-medium italic [font-family:var(--font-quiet-hours-display)]">
              Pasadya, at your own pace.
            </p>
            <p className="mt-2 text-xs font-semibold text-[#5D6170]">
              Quiet Hours is a private homepage concept preview.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold"
          >
            <FooterLink href="/search">Places</FooterLink>
            <FooterLink href="/transport">Transport</FooterLink>
            <FooterLink href="/portal/claims/new">Claim</FooterLink>
            <FooterLink href="/homepage-concepts">Concepts</FooterLink>
          </nav>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#0B1735]/10 pt-5 text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[#737685]">
          <span>Davao City + Samal Island</span>
          <span>No live hours or availability shown</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="inline-flex min-h-11 min-w-11 items-center justify-center outline-none underline decoration-[#1748C8]/25 underline-offset-4 hover:text-[#1748C8] focus-visible:ring-2 focus-visible:ring-[#1748C8]"
      href={href}
    >
      {children}
    </Link>
  );
}

function listingLocation(listing: DiscoveryListing) {
  return (
    listing.address.municipality ??
    listing.address.barangay ??
    listing.address.province ??
    "Davao region"
  );
}

function formatPrice(price: number | null) {
  return price && price > 0
    ? pesoFormatter.format(price / 100)
    : "Confirm locally";
}

function formatRouteFare(route: TransportRoute) {
  if (route.fareMin === null && route.fareMax === null) return "Confirm fare";
  if (route.fareMin === null) return `Up to ${formatPrice(route.fareMax)}`;
  if (route.fareMax === null || route.fareMin === route.fareMax) {
    return formatPrice(route.fareMin);
  }

  return `${formatPrice(route.fareMin)}–${formatPrice(route.fareMax).replace(/^₱/, "")}`;
}

function humanizeMode(mode: TransportRoute["mode"]) {
  return mode
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const quietHoursStyles = String.raw`
  .qh-page {
    font-family: var(--font-quiet-hours-body), ui-sans-serif, system-ui, sans-serif;
  }

  @media (prefers-reduced-motion: reduce) {
    .qh-page,
    .qh-page * {
      scroll-behavior: auto !important;
    }
  }
`;

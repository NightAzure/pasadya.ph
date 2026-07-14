import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  BusFront,
  Clock3,
  Compass,
  ConciergeBell,
  MapPin,
  Search,
  ShipWheel,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { AfterglowReel } from "@/components/homepage-concepts/afterglow-reel";
import { ConceptBrand } from "@/components/homepage-concepts/shared";
import type {
  DiscoveryCollection,
  DiscoveryListing,
} from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

const AFTERGLOW_STYLE = {
  "--afterglow-oxblood": "#401421",
  "--afterglow-tomato": "#FF574A",
  "--afterglow-powder": "#B8D9FF",
  "--afterglow-lemon": "#F4F26A",
  "--afterglow-paper": "#FFF7ED",
} as CSSProperties;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const CATEGORY_BOARDS = [
  {
    category: "resort",
    label: "Resorts",
    note: "Sea-facing stays & day trips",
    href: "/search?category=resort",
    icon: Waves,
    className: "bg-[#FF574A] md:col-span-7 xl:col-span-5 xl:min-h-[300px]",
  },
  {
    category: "room",
    label: "Rooms",
    note: "Sleep close to the next stop",
    href: "/search?category=room",
    icon: BedDouble,
    className: "bg-[#B8D9FF] md:col-span-5 xl:col-span-3 xl:min-h-[300px]",
  },
  {
    category: "restaurant",
    label: "Food",
    note: "Tables worth crossing town for",
    href: "/search?category=restaurant",
    icon: UtensilsCrossed,
    className: "bg-[#F4F26A] md:col-span-5 xl:col-span-4 xl:min-h-[300px]",
  },
  {
    category: "activity",
    label: "Things to do",
    note: "Make the free hours count",
    href: "/search?category=activity",
    icon: Sparkles,
    className:
      "bg-[#401421] text-[#FFF7ED] md:col-span-7 xl:col-span-7 xl:min-h-[250px]",
  },
  {
    category: "service",
    label: "Services",
    note: "Useful local help, close by",
    href: "/search?category=service",
    icon: ConciergeBell,
    className: "bg-[#FFF7ED] md:col-span-12 xl:col-span-5 xl:min-h-[250px]",
  },
] as const;

const GUIDE_FALLBACKS = [
  "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
  "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
] as const;

type AfterglowSocialProps = {
  data: ConceptHomeData;
  fontClassName?: string;
};

export function AfterglowSocial({
  data,
  fontClassName = "",
}: AfterglowSocialProps) {
  const listings = (
    data.listings.length ? data.listings : data.featuredListings
  ).slice(0, 6);
  const collections = data.collections.slice(0, 2);
  const routes = data.routes.slice(0, 3);
  const ferries = data.ferries.slice(0, 2);
  const claimHref = listings[0]
    ? `/portal/claims/new?listing=${encodeURIComponent(listings[0].slug)}`
    : "/portal";

  return (
    <div
      className={`${fontClassName} min-h-screen overflow-x-clip bg-[var(--afterglow-paper)] text-[var(--afterglow-oxblood)] selection:bg-[var(--afterglow-oxblood)] selection:text-[var(--afterglow-lemon)] [font-family:var(--font-afterglow-body)]`}
      style={AFTERGLOW_STYLE}
    >
      <AfterglowHeader />

      <main id="main-content">
        <AfterglowMasthead />
        <TransportBand ferries={ferries} routes={routes} />

        <section
          aria-labelledby="afterglow-reel-title"
          className="border-b-2 border-[#401421] bg-[#FFF7ED] px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
        >
          <div className="mx-auto max-w-[1360px]">
            <div className="mb-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.45fr)] lg:items-end">
              <div>
                <p className="inline-flex min-h-11 items-center border-2 border-[#401421] bg-[#B8D9FF] px-4 text-xs font-extrabold uppercase tracking-[0.18em] shadow-[4px_4px_0_#401421]">
                  The local reel · no autoplay
                </p>
                <h2
                  className="mt-6 max-w-4xl text-[clamp(2.85rem,7vw,6.5rem)] font-black leading-[0.86] tracking-[-0.055em] [font-family:var(--font-afterglow-display)]"
                  id="afterglow-reel-title"
                >
                  Places with good energy.
                </h2>
              </div>
              <p className="max-w-md text-sm font-semibold leading-7 text-[#401421]/70 lg:justify-self-end">
                Move through a short edit of published places. Prices, crowd
                signals, and details stay visible while you choose the next
                story.
              </p>
            </div>

            <AfterglowReel listings={listings} />
          </div>
        </section>

        <CategorySignboard listings={listings} />
        <GuidePosters collections={collections} />
        <OwnerBand claimHref={claimHref} />
      </main>

      <AfterglowFooter claimHref={claimHref} />
    </div>
  );
}

function AfterglowHeader() {
  return (
    <header className="relative z-30 border-b-2 border-[#401421] bg-[#FFF7ED]">
      <div className="border-b-2 border-[#401421] bg-[#401421] px-4 text-[#FFF7ED] sm:px-8">
        <div className="mx-auto flex min-h-11 max-w-[1360px] items-center justify-between gap-5 text-[10px] font-extrabold uppercase tracking-[0.16em] sm:text-xs">
          <p>Davao City ↔ Samal Island</p>
          <p className="hidden text-[#F4F26A] sm:block">
            Search · compare · head out
          </p>
          <Link
            className="inline-flex min-h-11 items-center underline decoration-[#FF574A] decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#F4F26A]"
            href="/homepage-concepts"
          >
            Concept gallery
          </Link>
        </div>
      </div>

      <div className="mx-auto flex min-h-[76px] max-w-[1360px] items-center justify-between gap-5 px-4 sm:px-8 lg:px-12">
        <div className="[&_a]:text-[#401421] [&_a]:focus-visible:ring-[#401421] [&_span:first-child]:rounded-none [&_span:first-child]:ring-[#401421]/20">
          <ConceptBrand homeHref="/homepage-concepts/afterglow-social" />
        </div>
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {[
            ["Discover", "/search"],
            ["Route guide", "/transport"],
            ["Account", "/account"],
          ].map(([label, href]) => (
            <Link
              className="inline-flex min-h-11 items-center px-4 text-sm font-extrabold outline-none transition-colors hover:bg-[#B8D9FF] focus-visible:ring-2 focus-visible:ring-[#401421] motion-reduce:transition-none"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          className="inline-flex min-h-11 items-center gap-2 border-2 border-[#401421] bg-[#FF574A] px-3 text-xs font-extrabold text-[#401421] shadow-[3px_3px_0_#401421] outline-none focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED] md:hidden"
          href="/search"
        >
          Explore
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function AfterglowMasthead() {
  return (
    <section
      aria-labelledby="afterglow-hero-title"
      className="border-b-2 border-[#401421] bg-[#FFF7ED] px-4 py-6 sm:px-8 sm:py-10 lg:px-12"
    >
      <div className="mx-auto grid max-w-[1360px] gap-5 lg:grid-cols-12">
        <div className="relative border-2 border-[#401421] bg-[#FF574A] p-5 shadow-[7px_7px_0_#401421] sm:p-8 lg:col-span-8 lg:p-10 xl:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex min-h-11 items-center bg-[#401421] px-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FFF7ED]">
              A brighter way to plan nearby
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em]">
              Homepage preview 06
            </p>
          </div>

          <h1
            className="mt-10 max-w-5xl text-[clamp(3.5rem,9vw,9.25rem)] font-black leading-[0.78] tracking-[-0.075em] [font-family:var(--font-afterglow-display)]"
            id="afterglow-hero-title"
          >
            Plan less.
            <span className="mt-4 block text-[#FFF7ED]">Feel the day.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base font-bold leading-7 sm:text-lg sm:leading-8">
            Find the stay, table, swim, or side trip that fits—and keep the
            route home close at hand.
          </p>

          <SearchTicket />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-[minmax(360px,1fr)_auto]">
          <div className="relative min-h-[390px] overflow-hidden border-2 border-[#401421] bg-[#401421] shadow-[7px_7px_0_#B8D9FF] lg:min-h-0">
            <Image
              alt="Davao at golden hour"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
              src="/homepage-concepts/shared-photography/davao-sunset-desktop.webp"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#401421]/80 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-[#FFF7ED]">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F4F26A]">
                  Afterglow 01
                </p>
                <p className="mt-2 max-w-[13rem] text-xl font-extrabold leading-tight">
                  Davao, just before the lights come on.
                </p>
              </div>
              <MapPin aria-hidden="true" className="h-7 w-7 shrink-0" />
            </div>
          </div>

          <div className="relative flex min-h-[190px] flex-col justify-between overflow-hidden border-2 border-[#401421] bg-[#B8D9FF] p-5 shadow-[7px_7px_0_#401421] sm:min-h-full lg:min-h-[180px]">
            <span className="inline-flex h-12 w-12 items-center justify-center border-2 border-[#401421] bg-[#F4F26A]">
              <Compass aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="mt-8">
              <p className="text-2xl font-black leading-none tracking-[-0.035em] [font-family:var(--font-afterglow-display)]">
                City to island,
                <br /> without the guesswork.
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold underline decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#401421]"
                href="/transport"
              >
                Open the route guide
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchTicket() {
  return (
    <form
      action="/search"
      className="relative mt-10 grid gap-2 border-2 border-[#401421] bg-[#FFF7ED] p-3 shadow-[6px_6px_0_#401421] sm:grid-cols-2 xl:grid-cols-12"
      method="get"
      role="search"
    >
      <label className="grid min-w-0 gap-1.5 border-2 border-[#401421]/20 bg-white p-2 sm:col-span-2 xl:col-span-4">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.17em]">
          What are you in the mood for?
        </span>
        <span className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2"
          />
          <input
            autoComplete="off"
            className="min-h-12 w-full bg-transparent py-2 pl-9 pr-2 text-base font-bold outline-none placeholder:text-[#401421]/65 focus-visible:ring-2 focus-visible:ring-[#401421]"
            name="q"
            placeholder="Beach day, coffee, airport stay…"
            spellCheck={false}
            type="search"
          />
        </span>
      </label>

      <TicketSelect label="Area" name="area" defaultValue="">
        <option value="">Everywhere</option>
        <option value="davao-city">Davao City</option>
        <option value="samal">Samal Island</option>
      </TicketSelect>

      <TicketSelect label="Type" name="category" defaultValue="">
        <option value="">Any place</option>
        {CATEGORY_BOARDS.map((category) => (
          <option key={category.category} value={category.category}>
            {category.label}
          </option>
        ))}
      </TicketSelect>

      <TicketSelect label="Budget" name="maxPrice" defaultValue="">
        <option value="">Any budget</option>
        <option value="500">Up to ₱500</option>
        <option value="1000">Up to ₱1,000</option>
        <option value="2500">Up to ₱2,500</option>
        <option value="5000">Up to ₱5,000</option>
      </TicketSelect>

      <button
        className="inline-flex min-h-14 items-center justify-center gap-2 border-2 border-[#401421] bg-[#401421] px-5 text-sm font-extrabold text-[#FFF7ED] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED] active:translate-y-0 motion-reduce:transform-none sm:col-span-2 xl:col-span-2"
        type="submit"
      >
        Search Pasadya
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </form>
  );
}

function TicketSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 border-2 border-[#401421]/20 bg-white p-2 xl:col-span-2">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.17em]">
        {label}
      </span>
      <select
        className="min-h-12 w-full bg-transparent px-1 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#401421]"
        defaultValue={defaultValue}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function TransportBand({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const firstRoute = routes[0];
  const secondRoute = routes[1];
  const firstFerry = ferries[0];

  return (
    <section
      aria-labelledby="afterglow-transport-title"
      className="border-b-2 border-[#401421] bg-[#401421] px-4 py-12 text-[#FFF7ED] sm:px-8 sm:py-16 lg:px-12"
    >
      <div className="mx-auto max-w-[1360px]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#F4F26A]">
              Getting there is part of the plan
            </p>
            <h2
              className="mt-3 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.045em] sm:text-6xl [font-family:var(--font-afterglow-display)]"
              id="afterglow-transport-title"
            >
              Three useful checks.
            </h2>
          </div>
          <Link
            className="inline-flex min-h-12 items-center gap-2 self-start border-2 border-[#FFF7ED] bg-[#F4F26A] px-5 text-sm font-extrabold text-[#401421] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[#B8D9FF] active:translate-y-0 motion-reduce:transform-none md:self-auto"
            href="/transport"
          >
            Open transport guide
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-9 grid border-2 border-[#FFF7ED]/65 md:grid-cols-3">
          <TransportStep
            accent="bg-[#FF574A]"
            available={Boolean(firstRoute)}
            eyebrow="01 / City routes"
            icon={BusFront}
            meta={
              firstRoute
                ? `${humanizeMode(firstRoute.mode)} · ${formatFareRange(firstRoute.fareMin, firstRoute.fareMax)}`
                : "Published route details are being refreshed"
            }
            title={firstRoute?.name ?? "Choose a city connection"}
          />
          <TransportStep
            accent="bg-[#B8D9FF]"
            available={Boolean(firstFerry)}
            eyebrow="02 / Water crossings"
            icon={ShipWheel}
            meta={
              firstFerry
                ? `${formatPrice(firstFerry.fare || null)} · ${firstFerry.durationMinutes > 0 ? `${firstFerry.durationMinutes} min` : "Confirm duration"}`
                : "Ferry details are being refreshed"
            }
            title={
              firstFerry
                ? `${firstFerry.origin} → ${firstFerry.destination}`
                : "Check the next crossing"
            }
          />
          <TransportStep
            accent="bg-[#F4F26A]"
            available={Boolean(secondRoute)}
            eyebrow="03 / More routes"
            icon={MapPin}
            meta={
              secondRoute
                ? `${humanizeMode(secondRoute.mode)} · ${formatFareRange(secondRoute.fareMin, secondRoute.fareMax)}`
                : "More published routes are being refreshed"
            }
            title={secondRoute?.name ?? "Compare another city connection"}
          />
        </div>
      </div>
    </section>
  );
}

function TransportStep({
  eyebrow,
  title,
  meta,
  icon: Icon,
  accent,
  available,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  icon: typeof BusFront;
  accent: string;
  available: boolean;
}) {
  return (
    <Link
      className="group relative min-h-[250px] border-b-2 border-[#FFF7ED]/65 p-6 outline-none transition-colors hover:bg-[#FFF7ED]/5 focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-[#F4F26A] motion-reduce:transition-none md:border-b-0 md:border-r-2 md:last:border-r-0 sm:p-7"
      href="/transport"
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center border-2 border-[#FFF7ED] text-[#401421] ${accent}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="h-6 w-6 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
        />
      </div>
      <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F4F26A]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-extrabold leading-tight">{title}</h3>
      <p className="mt-4 flex items-center gap-2 text-xs font-bold text-[#FFF7ED]/65">
        {available ? (
          <Ticket aria-hidden="true" className="h-4 w-4 shrink-0" />
        ) : (
          <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
        )}
        {meta}
      </p>
    </Link>
  );
}

function CategorySignboard({ listings }: { listings: DiscoveryListing[] }) {
  return (
    <section
      aria-labelledby="afterglow-categories-title"
      className="border-b-2 border-[#401421] bg-[#B8D9FF] px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
    >
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em]">
              Pick a direction
            </p>
            <h2
              className="mt-3 text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.86] tracking-[-0.055em] [font-family:var(--font-afterglow-display)]"
              id="afterglow-categories-title"
            >
              The big signboard.
            </h2>
          </div>
          <p className="max-w-sm text-sm font-semibold leading-7 text-[#401421]/70">
            Five clear ways in. Every sign opens the complete search, ready for
            your next filter.
          </p>
        </div>

        <nav
          aria-label="Browse place categories"
          className="grid grid-cols-1 gap-4 md:grid-cols-12"
        >
          {CATEGORY_BOARDS.map((category, index) => {
            const Icon = category.icon;
            const count = listings.filter(
              (listing) => listing.category === category.category,
            ).length;

            return (
              <Link
                className={`group relative flex min-h-[220px] flex-col justify-between overflow-hidden border-2 border-[#401421] p-6 shadow-[6px_6px_0_#401421] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FFF7ED] motion-reduce:transform-none sm:p-8 ${category.className}`}
                href={category.href}
                key={category.category}
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="text-xs font-extrabold uppercase tracking-[0.17em]">
                    {String(index + 1).padStart(2, "0")} / Browse
                  </span>
                  <Icon aria-hidden="true" className="h-8 w-8" />
                </div>
                <div className="mt-10">
                  <h3 className="text-4xl font-black leading-none tracking-[-0.045em] sm:text-5xl [font-family:var(--font-afterglow-display)]">
                    {category.label}
                  </h3>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t-2 border-current/25 pt-4 text-xs font-bold">
                    <span>{category.note}</span>
                    <span className="inline-flex min-h-11 items-center gap-2">
                      {count > 0 ? `${count} in this edit` : "Browse all"}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

function GuidePosters({ collections }: { collections: DiscoveryCollection[] }) {
  return (
    <section
      aria-labelledby="afterglow-guides-title"
      className="border-b-2 border-[#401421] bg-[#FFF7ED] px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
    >
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-9 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#401421]">
              Local edits
            </p>
            <h2
              className="mt-3 text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.86] tracking-[-0.055em] [font-family:var(--font-afterglow-display)]"
              id="afterglow-guides-title"
            >
              Save the poster.
            </h2>
          </div>
          <p className="max-w-sm text-sm font-semibold leading-7 text-[#401421]/70">
            Focused collections for when “somewhere good” needs a sharper
            answer.
          </p>
        </div>

        {collections.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {collections.map((collection, index) => (
              <GuidePoster
                collection={collection}
                index={index}
                key={collection.id}
              />
            ))}
            {collections.length === 1 ? <GuideEmpty compact /> : null}
          </div>
        ) : (
          <GuideEmpty />
        )}
      </div>
    </section>
  );
}

function GuidePoster({
  collection,
  index,
}: {
  collection: DiscoveryCollection;
  index: number;
}) {
  const background =
    collection.coverImage ?? GUIDE_FALLBACKS[index % GUIDE_FALLBACKS.length];

  return (
    <Link
      className="group relative grid min-h-[540px] overflow-hidden border-2 border-[#401421] bg-[#401421] text-[#FFF7ED] shadow-[8px_8px_0_#FF574A] outline-none focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FFF7ED] sm:min-h-[620px]"
      href={`/collections/${collection.slug}`}
    >
      <Image
        alt=""
        className="object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
        fill
        loading="lazy"
        sizes="(min-width: 1024px) 50vw, 100vw"
        src={background}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#401421] via-[#401421]/25 to-[#401421]/5" />
      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-9">
        <div className="flex items-start justify-between gap-5">
          <span
            className={`inline-flex min-h-11 items-center border-2 border-[#401421] px-4 text-xs font-extrabold uppercase tracking-[0.17em] text-[#401421] shadow-[4px_4px_0_#401421] ${index % 2 === 0 ? "bg-[#F4F26A]" : "bg-[#B8D9FF]"}`}
          >
            Guide {String(index + 1).padStart(2, "0")}
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="h-8 w-8 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
          />
        </div>
        <div>
          <h3 className="max-w-xl text-4xl font-black leading-[0.92] tracking-[-0.045em] sm:text-6xl [font-family:var(--font-afterglow-display)]">
            {collection.title}
          </h3>
          <p className="mt-5 line-clamp-3 max-w-lg text-sm font-semibold leading-7 text-[#FFF7ED]/75">
            {collection.description}
          </p>
          <span className="mt-7 inline-flex min-h-12 items-center gap-2 border-2 border-[#FFF7ED] bg-[#FFF7ED] px-5 text-sm font-extrabold text-[#401421]">
            Open this edit
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function GuideEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid place-items-center border-2 border-dashed border-[#401421] bg-[#F4F26A] p-8 text-center ${compact ? "min-h-[420px] lg:min-h-full" : "min-h-[360px]"}`}
    >
      <div className="max-w-lg">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em]">
          Next local edit
        </p>
        <h3 className="mt-4 text-3xl font-black leading-[0.94] tracking-[-0.04em] sm:text-5xl [font-family:var(--font-afterglow-display)]">
          A new guide is taking shape.
        </h3>
        <p className="mt-5 text-sm font-semibold leading-6 text-[#401421]/70">
          Explore every published place while the next collection is being
          prepared.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center gap-2 border-2 border-[#401421] bg-[#401421] px-5 text-sm font-extrabold text-[#FFF7ED] outline-none focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED]"
          href="/search"
        >
          Browse all places
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function OwnerBand({ claimHref }: { claimHref: string }) {
  return (
    <section className="border-b-2 border-[#401421] bg-[#F4F26A] px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid max-w-[1360px] gap-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="inline-flex min-h-11 items-center border-2 border-[#401421] bg-[#FFF7ED] px-4 text-xs font-extrabold uppercase tracking-[0.18em] shadow-[4px_4px_0_#401421]">
            For local owners
          </p>
          <h2 className="mt-7 max-w-5xl text-[clamp(3rem,7vw,7.25rem)] font-black leading-[0.82] tracking-[-0.06em] [font-family:var(--font-afterglow-display)]">
            Your place deserves a brighter pin.
          </h2>
        </div>
        <Link
          className="inline-flex min-h-14 items-center justify-center gap-3 border-2 border-[#401421] bg-[#FF574A] px-7 text-sm font-extrabold shadow-[6px_6px_0_#401421] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FFF7ED] active:translate-y-0 motion-reduce:transform-none"
          href={claimHref}
        >
          Claim your listing
          <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function AfterglowFooter({ claimHref }: { claimHref: string }) {
  return (
    <footer className="bg-[#401421] px-4 py-12 text-[#FFF7ED] sm:px-8 sm:py-16 lg:px-12">
      <div className="mx-auto max-w-[1360px]">
        <div className="grid gap-12 border-b border-[#FFF7ED]/20 pb-12 md:grid-cols-[1.1fr_1.6fr]">
          <div>
            <div className="[&_a]:text-[#FFF7ED] [&_a]:focus-visible:ring-[#F4F26A] [&_span:first-child]:rounded-none [&_span:first-child]:ring-[#FFF7ED]/25">
              <ConceptBrand homeHref="/homepage-concepts/afterglow-social" />
            </div>
            <p className="mt-5 max-w-sm text-sm font-semibold leading-7 text-[#FFF7ED]/60">
              Local discovery, honest price cues, and practical transport for
              Davao City + Samal Island.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
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
              ]}
              title="Legal"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-xs font-bold text-[#FFF7ED]/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Pasadya · Davao City + Samal Island
          </p>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 bg-[#FF574A]" />
            Afterglow Social · Homepage preview 06
          </div>
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
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F4F26A]">
        {title}
      </p>
      <ul className="mt-4 space-y-1">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              className="inline-flex min-h-11 min-w-11 items-center text-sm font-semibold text-[#FFF7ED]/65 outline-none transition-colors hover:text-[#FFF7ED] focus-visible:ring-2 focus-visible:ring-[#F4F26A] motion-reduce:transition-none"
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

function formatPrice(price: number | null) {
  return price ? pesoFormatter.format(price / 100) : "Ask locally";
}

function formatFareRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "Ask locally";
  if (min === null) return formatPrice(max);
  if (max === null || min === max) return formatPrice(min);

  return `${formatPrice(min)}–${formatPrice(max).replace(/^₱/, "")}`;
}

function humanizeMode(mode: TransportRoute["mode"]) {
  return mode
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

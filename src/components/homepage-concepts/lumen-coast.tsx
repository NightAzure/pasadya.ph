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
  Ticket,
  UserRound,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { LumenCoastLens } from "@/components/homepage-concepts/lumen-coast-lens";
import {
  ConceptBrand,
  formatConceptPrice,
} from "@/components/homepage-concepts/shared";
import type { DiscoveryCollection } from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

const categoryOptions = [
  ["", "Any kind"],
  ["resort", "Resorts"],
  ["room", "Rooms & stays"],
  ["restaurant", "Food & drink"],
  ["activity", "Activities"],
  ["service", "Services"],
] as const;

const categoryLinks = [
  ["Resorts", "/search?category=resort"],
  ["Rooms & stays", "/search?category=room"],
  ["Food & drink", "/search?category=restaurant"],
  ["Activities", "/search?category=activity"],
  ["Local services", "/search?category=service"],
] as const;

export function LumenCoast({ data }: { data: ConceptHomeData }) {
  const claimListing =
    data.listings.find((listing) => listing.claimStatus === "unclaimed") ??
    data.listings[0];
  const claimHref = claimListing
    ? `/portal/claims/new?listing=${encodeURIComponent(claimListing.slug)}`
    : "/search";

  return (
    <div className="lc-page min-h-screen overflow-x-clip bg-[#F7F3EA] text-[#2A1934] selection:bg-[#315CFF] selection:text-white">
      <LumenHeader />

      <main id="main-content">
        <section className="lc-masthead px-5 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14 lg:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(290px,.75fr)] lg:items-end">
              <div>
                <p className="lc-kicker">Davao City + Samal Island</p>
                <h1 className="mt-4 max-w-5xl text-[clamp(3.15rem,7vw,6.8rem)] font-semibold leading-[0.86] tracking-[-0.065em]">
                  Start with a feeling.
                  <span className="block text-[#315CFF]">Find the place.</span>
                </h1>
              </div>
              <div className="border-l border-[#2A1934]/20 pl-5 sm:pl-7">
                <p className="text-xl leading-8 italic text-[#2A1934]/78 sm:text-2xl sm:leading-9 [font-family:var(--font-lumen-serif)]">
                  A brighter local guide to stays, food, island days, and the
                  practical details between them.
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2A1934]/70">
                  <span>Local listings</span>
                  <span>Real routes</span>
                  <span>Clear pricing</span>
                </div>
              </div>
            </div>

            <LumenSearch />
          </div>
        </section>

        <LumenCoastLens listings={data.listings} />
        <JourneyReceipt ferries={data.ferries} routes={data.routes} />
        <GuideDiptych collections={data.collections} />
        <OwnerCallout claimHref={claimHref} />
      </main>

      <LumenFooter claimHref={claimHref} />
      <style>{lumenStyles}</style>
    </div>
  );
}

function LumenHeader() {
  return (
    <header className="lc-header sticky top-0 z-50 border-b border-[#2A1934]/15 bg-[#F7F3EA]/92 backdrop-blur-xl">
      <nav
        aria-label="Lumen Coast navigation"
        className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12"
      >
        <div className="[&_a]:!rounded-lg [&_a]:!text-[#2A1934] [&_img]:!rounded-lg [&_span:first-child]:!rounded-lg [&_span:first-child]:!ring-[#2A1934]/15">
          <ConceptBrand homeHref="/homepage-concepts/lumen-coast" />
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <Link className="lc-nav-link" href="/search">
            Discover
          </Link>
          <Link className="lc-nav-link" href="/transport">
            Getting there
          </Link>
          <Link className="lc-account-link ml-2" href="/account">
            <UserRound aria-hidden="true" className="h-4 w-4" />
            My Pasadya
          </Link>
        </div>

        <Link
          aria-label="Open your Pasadya account"
          className="lc-icon-link md:hidden"
          href="/account"
        >
          <UserRound aria-hidden="true" className="h-5 w-5" />
        </Link>
      </nav>
    </header>
  );
}

function LumenSearch() {
  return (
    <form
      action="/search"
      className="lc-search mt-9"
      method="get"
      role="search"
    >
      <div className="lc-search-intro">
        <Search aria-hidden="true" className="h-5 w-5" />
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#315CFF]">
            Search Pasadya
          </p>
          <p className="mt-0.5 text-sm font-semibold">Shape a good day out</p>
        </div>
      </div>

      <label className="lc-field lc-field-query">
        <span>What sounds good?</span>
        <input
          autoComplete="off"
          name="q"
          placeholder="Beach day, dinner, airport stay…"
          spellCheck={false}
          type="search"
        />
      </label>

      <label className="lc-field">
        <span>Area</span>
        <select defaultValue="" name="area">
          <option value="">Davao + Samal</option>
          <option value="davao-city">Davao City</option>
          <option value="samal">Samal Island</option>
        </select>
      </label>

      <label className="lc-field">
        <span>Kind</span>
        <select defaultValue="" name="category">
          {categoryOptions.map(([value, label]) => (
            <option key={label} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="lc-field">
        <span>Up to</span>
        <select defaultValue="" name="maxPrice">
          <option value="">Any budget</option>
          <option value="500">₱500</option>
          <option value="1500">₱1,500</option>
          <option value="3000">₱3,000</option>
          <option value="5000">₱5,000</option>
        </select>
      </label>

      <button className="lc-search-button" type="submit">
        <Compass aria-hidden="true" className="h-4 w-4" />
        Find my place
      </button>
    </form>
  );
}

function JourneyReceipt({
  routes,
  ferries,
}: {
  routes: TransportRoute[];
  ferries: FerrySchedule[];
}) {
  const route = routes.find((item) => item.mode !== "ferry") ?? routes[0];
  const ferry = ferries[0];
  const hasSignals = Boolean(route || ferry);

  return (
    <section
      aria-labelledby="lumen-journey-title"
      className="relative overflow-hidden bg-[#DDE8FF] px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="lc-orbit lc-orbit-one" />
      <div className="lc-orbit lc-orbit-two" />
      <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-24">
        <div>
          <p className="lc-kicker text-[#233FAD]">The journey receipt</p>
          <h2
            className="mt-4 max-w-xl text-[clamp(2.75rem,5vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.055em]"
            id="lumen-journey-title"
          >
            Know the way before you go.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#2A1934]/68 sm:text-lg sm:leading-8">
            A simple read on local routes and sea crossings. Compare what is
            available, then confirm current times and fares with operators.
          </p>
          <Link className="lc-primary-button mt-8" href="/transport">
            Open the transport guide
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div
          aria-label="Current transport signals"
          className="lc-receipt"
          role="group"
        >
          <div className="flex items-start justify-between gap-6 border-b border-dashed border-[#2A1934]/25 pb-6">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#315CFF]">
                Pasadya route desk
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                City ↔ island notes
              </p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FF6A4D] text-white">
              <Ticket aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>

          {hasSignals ? (
            <div className="divide-y divide-dashed divide-[#2A1934]/22">
              {route ? <ReceiptRoute route={route} /> : null}
              {ferry ? <ReceiptFerry ferry={ferry} /> : null}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Route
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-[#315CFF]"
              />
              <p className="mt-5 text-2xl italic [font-family:var(--font-lumen-serif)]">
                Fresh route notes are on the way.
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#2A1934]/65">
                The transport guide remains the best place to check for newly
                published local options.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#2A1934]/25 pt-5 text-xs font-semibold text-[#2A1934]/70">
            <span>Fares and schedules can change.</span>
            <Link className="lc-text-link" href="/transport">
              Compare all routes
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReceiptRoute({ route }: { route: TransportRoute }) {
  return (
    <div className="grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#315CFF] text-white">
        <Route aria-hidden="true" className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#315CFF]">
          {modeLabel(route.mode)} · {route.stops.length} stops
        </p>
        <h3 className="mt-1.5 text-lg font-semibold leading-snug">
          {route.name}
        </h3>
      </div>
      <p className="text-sm font-extrabold sm:text-right">
        {formatRouteFare(route)}
      </p>
    </div>
  );
}

function ReceiptFerry({ ferry }: { ferry: FerrySchedule }) {
  return (
    <div className="grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FF6A4D] text-white">
        <Ship aria-hidden="true" className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A73524]">
          Ferry ·{" "}
          {ferry.durationMinutes > 0
            ? `about ${ferry.durationMinutes} min`
            : "confirm duration"}
        </p>
        <h3 className="mt-1.5 text-lg font-semibold leading-snug">
          {ferry.origin} → {ferry.destination}
        </h3>
      </div>
      <p className="text-sm font-extrabold sm:text-right">
        {formatConceptPrice(ferry.fare)}
      </p>
    </div>
  );
}

function GuideDiptych({ collections }: { collections: DiscoveryCollection[] }) {
  const guides = collections.slice(0, 2);

  return (
    <section
      aria-labelledby="lumen-guides-title"
      className="bg-[#F7F3EA] px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-6 border-t border-[#2A1934]/20 pt-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="lc-kicker">Small guides, good instincts</p>
            <h2
              className="mt-3 max-w-3xl text-[clamp(2.5rem,5vw,5.25rem)] font-semibold leading-[0.94] tracking-[-0.055em]"
              id="lumen-guides-title"
            >
              Let the day take shape.
            </h2>
          </div>
          <Link className="lc-text-link" href="/search">
            Browse every place
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {guides.length > 0 ? (
          <div className="lc-guide-grid mt-10">
            {guides.map((collection, index) => (
              <GuidePanel
                collection={collection}
                index={index}
                key={collection.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid min-h-[340px] place-items-center border-y border-[#2A1934]/20 bg-[#FFFDF8] px-6 py-16 text-center">
            <div>
              <MapPin
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-[#FF6A4D]"
              />
              <h3 className="mt-5 text-3xl italic [font-family:var(--font-lumen-serif)]">
                The next local guide is being assembled.
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#2A1934]/65">
                Search the current directory for stays, meals, and things to do
                in the meantime.
              </p>
              <Link className="lc-primary-button mt-7" href="/search">
                Explore the directory
              </Link>
            </div>
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
      className={`lc-guide group ${index % 2 === 1 ? "lc-guide-alt" : ""}`}
      href={`/collections/${collection.slug}`}
    >
      <div className="lc-guide-image">
        {collection.coverImage ? (
          <Image
            alt=""
            className="object-cover"
            fill
            loading="lazy"
            sizes="(min-width: 768px) 50vw, 100vw"
            src={collection.coverImage}
          />
        ) : (
          <div className="lc-guide-fallback" />
        )}
        <span className="lc-guide-number">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="lc-guide-copy">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#315CFF]">
            Local field guide · {collection.listingIds.length} places
          </span>
          <span className="lc-guide-arrow">
            <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
        <h3 className="mt-10 max-w-xl text-3xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
          {collection.title}
        </h3>
        <p className="mt-5 max-w-xl text-sm leading-6 text-[#2A1934]/65 sm:text-base sm:leading-7">
          {collection.description}
        </p>
      </div>
    </Link>
  );
}

function OwnerCallout({ claimHref }: { claimHref: string }) {
  return (
    <section className="lc-owner relative overflow-hidden bg-[#2A1934] px-5 py-20 text-[#F7F3EA] sm:px-8 sm:py-24 lg:px-12">
      <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#B7C9FF]">
            Made here? Be seen here.
          </p>
          <h2 className="mt-4 max-w-4xl text-[clamp(3rem,6vw,6.5rem)] font-semibold leading-[0.88] tracking-[-0.06em]">
            Your place belongs in the local picture.
          </h2>
        </div>
        <div className="lg:border-l lg:border-white/20 lg:pl-8">
          <p className="text-xl leading-8 italic text-white/72 sm:text-2xl sm:leading-9 [font-family:var(--font-lumen-serif)]">
            Claim your listing to keep details useful, current, and ready for
            the people already looking.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="lc-owner-primary" href={claimHref}>
              Claim a listing
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="lc-owner-secondary" href="/portal">
              Owner portal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function LumenFooter({ claimHref }: { claimHref: string }) {
  return (
    <footer className="bg-[#F7F3EA] px-5 pb-10 pt-14 sm:px-8 sm:pt-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-12 border-b border-[#2A1934]/20 pb-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(3,.65fr)]">
          <div>
            <div className="[&_a]:!text-[#2A1934] [&_span:first-child]:!ring-[#2A1934]/15">
              <ConceptBrand homeHref="/homepage-concepts/lumen-coast" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#2A1934]/70">
              Local discovery, useful prices, and clearer ways around Davao City
              + Samal Island.
            </p>
          </div>
          <FooterList
            label="Discover"
            links={[
              ["Search places", "/search"],
              ["Davao City", "/search?area=davao-city"],
              ["Samal Island", "/search?area=samal"],
            ]}
          />
          <FooterList
            label="Plan"
            links={[
              ["Transport guide", "/transport"],
              ["My account", "/account"],
              ["All concepts", "/homepage-concepts"],
            ]}
          />
          <FooterList
            label="For owners"
            links={[
              ["Claim a listing", claimHref],
              ["Owner portal", "/portal"],
            ]}
          />
        </div>

        <div className="flex flex-col gap-5 py-7 text-xs font-semibold text-[#2A1934]/70 sm:flex-row sm:items-center sm:justify-between">
          <p>Pasadya · Find the place. Know the way.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categoryLinks.slice(0, 3).map(([label, href]) => (
              <Link className="lc-footer-mini-link" href={href} key={href}>
                {label}
              </Link>
            ))}
          </div>
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
  links: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <nav aria-label={label}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#315CFF]">
        {label}
      </p>
      <ul className="mt-4 space-y-1 text-sm font-semibold text-[#2A1934]/65">
        {links.map(([name, href]) => (
          <li key={`${name}-${href}`}>
            <Link className="lc-footer-link" href={href}>
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function modeLabel(mode: TransportRoute["mode"]) {
  return mode.replace("_", " ");
}

function formatRouteFare(route: TransportRoute) {
  if (route.fareMin === null && route.fareMax === null) return "Ask for fare";
  if (route.fareMax === null || route.fareMin === route.fareMax) {
    return formatConceptPrice(route.fareMin);
  }
  if (route.fareMin === null)
    return `Up to ${formatConceptPrice(route.fareMax)}`;
  return `${formatConceptPrice(route.fareMin)}–${formatConceptPrice(route.fareMax)}`;
}

const lumenStyles = String.raw`
  .lc-page {
    --lc-rice: #F7F3EA;
    --lc-plum: #2A1934;
    --lc-cobalt: #315CFF;
    --lc-persimmon: #FF6A4D;
    --lc-mist: #DDE8FF;
    font-family: var(--font-lumen-sans), ui-sans-serif, system-ui, sans-serif;
  }
  .lc-page :is(a, button, input, select):focus-visible {
    outline: 2px solid var(--lc-cobalt);
    outline-offset: 3px;
  }
  .lc-kicker {
    font-size: .68rem;
    font-weight: 800;
    letter-spacing: .2em;
    line-height: 1.4;
    text-transform: uppercase;
  }
  .lc-header { transition: background-color .2s ease; }
  .lc-nav-link,
  .lc-account-link,
  .lc-icon-link {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: .875rem;
    font-weight: 700;
    transition: background-color .2s ease, color .2s ease, transform .2s ease;
  }
  .lc-nav-link { padding: .65rem 1rem; color: rgba(42,25,52,.66); }
  .lc-nav-link:hover { background: rgba(42,25,52,.06); color: var(--lc-plum); }
  .lc-account-link {
    gap: .5rem;
    border: 1px solid rgba(42,25,52,.22);
    padding: .65rem 1.1rem;
  }
  .lc-account-link:hover { border-color: var(--lc-cobalt); color: var(--lc-cobalt); }
  .lc-icon-link { width: 44px; border: 1px solid rgba(42,25,52,.22); }
  .lc-masthead {
    background:
      radial-gradient(circle at 78% 15%, rgba(49,92,255,.12), transparent 23rem),
      linear-gradient(180deg, rgba(255,255,255,.36), transparent);
  }
  .lc-search {
    display: grid;
    gap: 1px;
    overflow: hidden;
    border: 1px solid rgba(42,25,52,.22);
    border-radius: 1.1rem;
    background: rgba(42,25,52,.22);
    box-shadow: 0 22px 65px rgba(42,25,52,.09);
  }
  .lc-search-intro,
  .lc-field { background: rgba(255,253,248,.96); }
  .lc-search-intro {
    display: flex;
    min-height: 64px;
    align-items: center;
    gap: .8rem;
    padding: .8rem 1rem;
  }
  .lc-field {
    display: grid;
    min-width: 0;
    gap: .3rem;
    padding: .7rem 1rem .55rem;
  }
  .lc-field > span {
    font-size: .62rem;
    font-weight: 800;
    letter-spacing: .15em;
    text-transform: uppercase;
    color: rgba(42,25,52,.7);
  }
  .lc-field :is(input, select) {
    min-height: 44px;
    width: 100%;
    min-width: 0;
    border: 0;
    border-radius: .45rem;
    background: transparent;
    padding: .35rem 0;
    color: var(--lc-plum);
    font-size: .95rem;
    font-weight: 700;
    outline: none;
  }
  .lc-field input::placeholder { color: rgba(42,25,52,.62); }
  .lc-search :is(input, select, button):focus-visible { outline-offset: -4px; }
  .lc-search-button {
    display: inline-flex;
    min-height: 54px;
    align-items: center;
    justify-content: center;
    gap: .55rem;
    border: 0;
    background: var(--lc-cobalt);
    padding: .8rem 1.2rem;
    color: white;
    font-size: .85rem;
    font-weight: 800;
    transition: background-color .2s ease, transform .2s ease;
  }
  .lc-search-button:hover { background: var(--lc-plum); }
  .lc-area-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: .25rem;
    width: min(100%, 390px);
    border: 1px solid rgba(42,25,52,.2);
    border-radius: 999px;
    background: #FFFDF8;
    padding: .25rem;
  }
  .lc-area-button {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    gap: .55rem;
    border-radius: 999px;
    padding: .6rem .9rem;
    font-size: .78rem;
    font-weight: 800;
    color: rgba(42,25,52,.62);
    transition: background-color .2s ease, color .2s ease, transform .2s ease;
  }
  .lc-area-button:hover { color: var(--lc-plum); }
  .lc-area-button[aria-pressed="true"] {
    background: var(--lc-plum);
    color: white;
  }
  .lc-area-dot { width: .45rem; height: .45rem; border-radius: 50%; background: var(--lc-persimmon); }
  .lc-area-button[aria-pressed="true"] .lc-area-dot { background: #B7C9FF; }
  .lc-text-link {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: .45rem;
    border-bottom: 1px solid currentColor;
    color: var(--lc-plum);
    font-size: .8rem;
    font-weight: 800;
    transition: color .2s ease, border-color .2s ease;
  }
  .lc-text-link:hover { color: var(--lc-cobalt); }
  .lc-photo-ribbon {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    grid-template-rows: 310px 170px;
    gap: .75rem;
  }
  .lc-lens-photo {
    position: relative;
    min-width: 0;
    overflow: hidden;
    border-radius: .65rem;
    background: var(--lc-mist);
    animation: lc-photo-in .45s ease both;
  }
  .lc-lens-photo-1 { grid-column: 1 / -1; }
  .lc-lens-photo::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 42%, rgba(42,25,52,.84));
    pointer-events: none;
  }
  .lc-lens-photo figcaption {
    position: absolute;
    z-index: 1;
    right: .8rem;
    bottom: .8rem;
    left: .8rem;
    color: white;
    font-size: .68rem;
    font-weight: 800;
    letter-spacing: .11em;
    text-transform: uppercase;
    text-shadow: 0 1px 4px rgba(42,25,52,.8);
  }
  @keyframes lc-photo-in {
    from { opacity: .35; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lc-local-index { border-top: 1px solid rgba(42,25,52,.2); }
  .lc-index-row {
    display: grid;
    grid-template-columns: auto minmax(0,1fr) auto;
    min-height: 96px;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid rgba(42,25,52,.2);
    padding: 1rem .1rem;
    transition: color .2s ease, padding .2s ease, background-color .2s ease;
  }
  .lc-index-row:hover { color: var(--lc-cobalt); padding-right: .7rem; padding-left: .7rem; background: rgba(255,255,255,.35); }
  .lc-index-number {
    align-self: start;
    padding-top: .2rem;
    font-family: var(--font-lumen-serif), serif;
    font-size: 1.05rem;
    font-style: italic;
    color: #A73524;
  }
  .lc-index-price { grid-column: 2; font-size: .78rem; font-weight: 800; color: rgba(42,25,52,.7); }
  .lc-index-arrow {
    display: grid;
    grid-column: 3;
    grid-row: 1;
    width: 44px;
    height: 44px;
    place-items: center;
    border: 1px solid rgba(42,25,52,.2);
    border-radius: 50%;
    transition: background-color .2s ease, color .2s ease, transform .2s ease;
  }
  .lc-index-row:hover .lc-index-arrow { background: var(--lc-cobalt); color: white; transform: rotate(5deg); }
  .lc-primary-button,
  .lc-owner-primary,
  .lc-owner-secondary {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: .55rem;
    border-radius: 999px;
    padding: .75rem 1.25rem;
    font-size: .82rem;
    font-weight: 800;
    transition: transform .2s ease, background-color .2s ease, color .2s ease;
  }
  .lc-primary-button { background: var(--lc-cobalt); color: white; }
  .lc-primary-button:hover { transform: translateY(-2px); background: var(--lc-plum); }
  .lc-orbit { position: absolute; border-radius: 50%; border: 1px solid rgba(49,92,255,.18); }
  .lc-orbit-one { right: -8rem; top: -9rem; width: 28rem; height: 28rem; }
  .lc-orbit-two { right: -2rem; top: -3rem; width: 16rem; height: 16rem; }
  .lc-receipt {
    position: relative;
    border: 1px solid rgba(42,25,52,.2);
    background: #FFFDF8;
    padding: 1.5rem;
    box-shadow: 14px 16px 0 rgba(49,92,255,.14);
  }
  .lc-receipt::before,
  .lc-receipt::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 18px;
    height: 36px;
    transform: translateY(-50%);
    background: var(--lc-mist);
  }
  .lc-receipt::before { left: -1px; border-radius: 0 18px 18px 0; border: 1px solid rgba(42,25,52,.2); border-left: 0; }
  .lc-receipt::after { right: -1px; border-radius: 18px 0 0 18px; border: 1px solid rgba(42,25,52,.2); border-right: 0; }
  .lc-guide-grid { display: grid; gap: 1rem; }
  .lc-guide {
    display: grid;
    min-width: 0;
    overflow: hidden;
    border-top: 1px solid rgba(42,25,52,.22);
    border-bottom: 1px solid rgba(42,25,52,.22);
    background: #FFFDF8;
  }
  .lc-guide-image { position: relative; min-height: 280px; overflow: hidden; background: var(--lc-mist); }
  .lc-guide-image img { transition: transform .6s cubic-bezier(.2,.7,.2,1); }
  .lc-guide:hover .lc-guide-image img { transform: scale(1.035); }
  .lc-guide-fallback {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 26% 30%, var(--lc-persimmon) 0 9%, transparent 9.5%),
      radial-gradient(circle at 72% 62%, var(--lc-cobalt) 0 16%, transparent 16.5%),
      linear-gradient(135deg, #DDE8FF, #FFFDF8);
  }
  .lc-guide-number {
    position: absolute;
    right: 1rem;
    bottom: 1rem;
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    border-radius: 50%;
    background: var(--lc-rice);
    color: var(--lc-plum);
    font-family: var(--font-lumen-serif), serif;
    font-style: italic;
  }
  .lc-guide-copy { padding: 1.5rem 1.25rem 2rem; }
  .lc-guide-arrow {
    display: grid;
    width: 44px;
    height: 44px;
    flex: none;
    place-items: center;
    border: 1px solid rgba(42,25,52,.22);
    border-radius: 50%;
    transition: background-color .2s ease, color .2s ease, transform .2s ease;
  }
  .lc-guide:hover .lc-guide-arrow { background: var(--lc-persimmon); color: white; transform: rotate(5deg); }
  .lc-owner::after {
    content: "";
    position: absolute;
    right: -9rem;
    bottom: -15rem;
    width: 34rem;
    height: 34rem;
    border-radius: 50%;
    background: var(--lc-cobalt);
    opacity: .32;
  }
  .lc-owner-primary { background: var(--lc-persimmon); color: var(--lc-plum); }
  .lc-owner-primary:hover { transform: translateY(-2px); background: white; color: var(--lc-plum); }
  .lc-owner-secondary { border: 1px solid rgba(255,255,255,.35); color: white; }
  .lc-owner-secondary:hover { border-color: white; background: rgba(255,255,255,.1); }
  .lc-owner :is(a,button):focus-visible { outline-color: #B7C9FF; }
  .lc-footer-link {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    transition: color .2s ease, transform .2s ease;
  }
  .lc-footer-link:hover { color: var(--lc-cobalt); transform: translateX(3px); }
  .lc-footer-mini-link { display: inline-flex; min-width: 44px; min-height: 44px; align-items: center; }
  .lc-footer-mini-link:hover { color: var(--lc-cobalt); }
  @media (min-width: 640px) {
    .lc-search { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .lc-search-intro { grid-column: 1 / -1; }
    .lc-search-button { grid-column: 1 / -1; min-height: 64px; }
    .lc-photo-ribbon { grid-template-rows: 390px 210px; gap: 1rem; }
    .lc-index-row { grid-template-columns: auto minmax(0,1fr) minmax(120px,auto) auto; gap: 1.25rem; }
    .lc-index-price { grid-column: 3; grid-row: 1; text-align: right; }
    .lc-index-arrow { grid-column: 4; }
    .lc-receipt { padding: 2rem; }
    .lc-guide-copy { padding: 2rem 2rem 2.5rem; }
  }
  @media (min-width: 768px) {
    .lc-icon-link { display: none; }
    .lc-guide-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .lc-guide-alt { margin-top: 3rem; }
    .lc-guide-image { min-height: 360px; }
  }
  @media (min-width: 1024px) {
    .lc-photo-ribbon {
      grid-template-columns: repeat(12, minmax(0,1fr));
      grid-template-rows: 245px 185px;
    }
    .lc-lens-photo-1 { grid-column: 1 / span 7; grid-row: 1 / span 2; }
    .lc-lens-photo-2 { grid-column: 8 / span 5; grid-row: 1; }
    .lc-lens-photo-3 { grid-column: 8 / span 5; grid-row: 2; }
    .lc-guide-image { min-height: 430px; }
  }
  @media (min-width: 1280px) {
    .lc-search {
      grid-template-columns: minmax(185px,.7fr) minmax(260px,1.3fr) minmax(145px,.72fr) minmax(145px,.72fr) minmax(125px,.6fr) auto;
      align-items: stretch;
    }
    .lc-search-intro { grid-column: auto; }
    .lc-search-button { grid-column: auto; min-width: 150px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lc-lens-photo { animation: none; }
    .lc-page * { transition-duration: .01ms !important; }
  }
`;

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bus,
  Compass,
  MapPin,
  Route,
  Search,
  Ship,
  Store,
} from "lucide-react";

import {
  HomepageSearchForm,
  TrackedHomepageLink,
} from "@/components/homepage-concepts/pasadya-daylight-analytics";
import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import { PasadyaDaylightPlannerTeaser } from "@/components/homepage-concepts/pasadya-daylight-plan";
import { PasadyaDaylightSavedSection } from "@/components/homepage-concepts/pasadya-daylight-saved";
import {
  DaylightFooter,
  DaylightHeader,
} from "@/components/homepage-concepts/pasadya-daylight-chrome";
import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import styles from "@/components/homepage-concepts/pasadya-daylight.module.css";
import type { DiscoveryListing } from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

const QUICK_PATHS = [
  {
    tone: "island",
    cue: "Island break",
    label: "Samal Day Use",
    note: "Resorts and beach stays for a simple day out.",
    href: "/search?area=samal&category=resort&q=day+use",
  },
  {
    tone: "coral",
    cue: "City appetite",
    label: "Davao Food",
    note: "Local restaurants and food stops across the city.",
    href: "/search?area=davao-city&category=restaurant",
  },
  {
    tone: "teal",
    cue: "Touchdown",
    label: "Stays Near the Airport",
    note: "Practical rooms for early flights and late arrivals.",
    href: "/search?area=davao-city&category=room&q=airport",
  },
] as const;

export function PasadyaDaylight({
  data,
  withChrome = true,
}: {
  data: ConceptHomeData;
  withChrome?: boolean;
}) {
  const listings = data.featuredListings.slice(0, 3);
  const featuredGuide =
    data.collections.find((collection) =>
      collection.title.toLowerCase().includes("samal"),
    ) ?? data.collections[0];
  const claimListing =
    data.listings.find((listing) => listing.claimStatus === "unclaimed") ??
    data.listings[0];
  const claimHref = claimListing
    ? `/portal/claims/new?listing=${encodeURIComponent(claimListing.slug)}`
    : "/portal/claims/new";

  const content = (
    <>
      <Hero listings={listings} />
      <QuickPaths />
      <PasadyaDaylightSavedSection listings={listings} />
      <PasadyaDaylightPlannerTeaser
        ferry={data.ferries[0]}
        listings={listings}
        route={data.routes[0]}
      />
      <TripToolsSection
        featuredGuide={featuredGuide}
        ferry={data.ferries[0]}
        listings={listings}
        route={data.routes[0]}
      />
      <OwnerSection claimHref={claimHref} />
    </>
  );

  return (
    <div className={styles.page}>
      {withChrome ? <DaylightHeader /> : null}
      {withChrome ? <main id="main-content">{content}</main> : content}
      {withChrome ? <DaylightFooter claimHref={claimHref} isConcept /> : null}
    </div>
  );
}

function Hero({ listings }: { listings: DiscoveryListing[] }) {
  const secondaryImage = listings[0]?.media[0];

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <MapPin aria-hidden="true" />
            Davao City, Davao del Sur & Samal
          </p>
          <p className={styles.localAside}>Laag ta</p>
          <h1>Find local places worth the trip—and know how to get there.</h1>
          <p className={styles.heroBody}>
            Compare prices, booking options, community reviews, crowd patterns,
            and practical routes before you go.
          </p>
        </div>

        <figure
          aria-label="A glimpse of local places in the Davao region and Samal"
          className={styles.heroVisual}
        >
          <div className={styles.heroImagePrimary}>
            <ResponsiveHeroArt
              desktopSizes="(min-width: 768px) 46vw, 100vw"
              desktopSrc="/homepage-concepts/shared-photography/samal-shore-desktop.webp"
              mobileSrc="/homepage-concepts/shared-photography/samal-shore-mobile.webp"
            />
          </div>
          {secondaryImage ? (
            <div className={styles.heroImageSecondary}>
              <Image
                alt=""
                fill
                sizes="(min-width: 768px) 180px, 120px"
                src={secondaryImage.url}
              />
            </div>
          ) : null}
          <div aria-hidden="true" className={styles.heroRouteLine}>
            <span />
            <span />
            <span />
          </div>
          <figcaption className={styles.heroCaption}>
            <span>Davao Region + Samal</span>
            <strong>Prices, reviews & routes</strong>
          </figcaption>
          <div className={styles.heroRouteBadge}>
            <Compass aria-hidden="true" />
            Local trip ideas
          </div>
        </figure>

        <HomepageSearchForm
          action="/search"
          className={styles.searchPanel}
          id="daylight-search"
          method="get"
          role="search"
        >
          <div className={styles.searchHeading}>
            <Compass aria-hidden="true" />
            <div>
              <p>Search Pasadya</p>
              <span>Start with a place or kind of day.</span>
            </div>
          </div>
          <label className={styles.field}>
            <span>What are you looking for?</span>
            <input
              autoComplete="off"
              name="q"
              placeholder="Try “Samal day use” or “food near the airport”…"
              spellCheck={false}
              type="search"
            />
          </label>
          <label className={styles.field}>
            <span>Location</span>
            <select defaultValue="" name="location">
              <option value="">Davao and nearby</option>
              <option value="Davao City">Davao City</option>
              <option value="Davao del Sur">Davao del Sur</option>
              <option value="Samal">Samal Island</option>
            </select>
          </label>
          <button className={styles.primaryAction} type="submit">
            <Search aria-hidden="true" />
            Search Places
          </button>
          <Link className={styles.moreFilters} href="/search">
            Browse All Filters
          </Link>
        </HomepageSearchForm>
      </div>
    </section>
  );
}

function QuickPaths() {
  return (
    <section
      aria-labelledby="quick-paths-title"
      className={`${styles.section} ${styles.quickSection} ${styles.quickSectionCompact}`}
    >
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Popular ways to start</p>
            <h2 id="quick-paths-title">Start With a Useful Search</h2>
          </div>
          <p>
            Open a focused result set, then compare the details that matter.
          </p>
        </div>
        <div className={`${styles.quickGrid} ${styles.quickGridCompact}`}>
          {QUICK_PATHS.map((path) => (
            <TrackedHomepageLink
              analyticsEvent="homepage_quick_start_click"
              analyticsProperties={{ label: path.label }}
              className={`${styles.quickCard} ${styles.quickCardCompact}`}
              data-tone={path.tone}
              href={path.href}
              key={path.label}
            >
              <span className={styles.quickCardBody}>
                <small className={styles.quickCue}>{path.cue}</small>
                <strong>{path.label}</strong>
                <small className={styles.quickNote}>{path.note}</small>
              </span>
              <span aria-hidden="true" className={styles.quickArrow}>
                <ArrowRight />
              </span>
            </TrackedHomepageLink>
          ))}
        </div>
      </div>
    </section>
  );
}

function TripToolsSection({
  featuredGuide,
  ferry,
  listings,
  route,
}: {
  featuredGuide: ConceptHomeData["collections"][number] | undefined;
  ferry: FerrySchedule | undefined;
  listings: DiscoveryListing[];
  route: TransportRoute | undefined;
}) {
  const guideImage =
    featuredGuide?.coverImage ?? listings[0]?.media[0]?.url ?? null;

  return (
    <section
      aria-labelledby="trip-tools-title"
      className={`${styles.section} ${styles.tripToolsSection}`}
      id="trip-tools"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Plan the whole trip</p>
            <h2 id="trip-tools-title">Local Picks & Practical Routes</h2>
          </div>
          <p>
            Choose a useful guide or check how the trip works before leaving.
          </p>
        </div>

        <div className={styles.tripToolsGrid}>
          <article className={styles.tripToolCard} id="guides">
            <div className={styles.tripToolImage}>
              {guideImage ? (
                <Image
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  src={guideImage}
                />
              ) : (
                <div className={styles.guideFallback}>Local guide</div>
              )}
            </div>
            <div className={styles.tripToolBody}>
              <p className={styles.kicker}>Local guide</p>
              <h3>{featuredGuide?.title ?? "A Practical Samal Day"}</h3>
              <p>
                {featuredGuide?.description ??
                  "A focused set of places for an easier day out."}
              </p>
              <Link
                className={styles.primaryLink}
                href={
                  featuredGuide
                    ? `/collections/${featuredGuide.slug}`
                    : "/search?area=samal"
                }
              >
                Open Guide
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>

          <article className={styles.tripToolCard} id="transport">
            <div className={styles.tripToolBody}>
              <p className={styles.kicker}>Before you leave</p>
              <h3>Check How to Get There</h3>
              <p>
                Review published jeepney, bus, and ferry information. Confirm
                current fares and schedules with the operator.
              </p>
              <div className={styles.tripRouteExamples}>
                {ferry ? <FerryPreview ferry={ferry} /> : null}
                {route ? <RoutePreview route={route} /> : null}
              </div>
              <TrackedHomepageLink
                analyticsEvent="homepage_transport_click"
                className={styles.primaryLink}
                href="/transport"
              >
                Open Transport Guide
                <ArrowRight aria-hidden="true" />
              </TrackedHomepageLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function FerryPreview({ ferry }: { ferry: FerrySchedule }) {
  return (
    <div className={styles.tripRouteExample}>
      <Ship aria-hidden="true" />
      <div>
        <strong>{ferry.routeName}</strong>
        <span>
          {formatPrice(ferry.fare)}
          {ferry.durationMinutes > 0
            ? ` · About ${ferry.durationMinutes} minutes`
            : ""}
        </span>
      </div>
    </div>
  );
}

function RoutePreview({ route }: { route: TransportRoute }) {
  return (
    <div className={styles.tripRouteExample}>
      {route.mode === "bus" ? (
        <Bus aria-hidden="true" />
      ) : (
        <Route aria-hidden="true" />
      )}
      <div>
        <strong>{route.name}</strong>
        <span>{formatFareRange(route.fareMin, route.fareMax)}</span>
      </div>
    </div>
  );
}

function OwnerSection({ claimHref }: { claimHref: string }) {
  return (
    <section
      aria-labelledby="owners-title"
      className={`${styles.section} ${styles.ownerSection}`}
      id="owners"
    >
      <div className={styles.ownerInner}>
        <Store aria-hidden="true" />
        <div>
          <p className={styles.kicker}>For local businesses</p>
          <h2 id="owners-title">Own a Local Business?</h2>
          <p>
            Claim your listing, keep your details accurate, and choose how
            customers can contact or book with you.
          </p>
        </div>
        <div className={styles.ownerActions}>
          <Link className={styles.ownerPrimary} href={claimHref}>
            Claim a Listing
          </Link>
          <Link className={styles.ownerSecondary} href="/portal">
            Owner Portal
          </Link>
        </div>
      </div>
    </section>
  );
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatPrice(price: number | null) {
  return price === null ? "Confirm fare" : pesoFormatter.format(price / 100);
}

function formatFareRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "Confirm fare";
  if (min === null) return `Up to ${formatPrice(max)}`;
  if (max === null || min === max) return formatPrice(min);
  return `${formatPrice(min)}–${formatPrice(max)}`;
}

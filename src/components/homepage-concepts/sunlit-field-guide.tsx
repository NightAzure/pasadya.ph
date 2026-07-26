import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Bookmark,
  BusFront,
  CalendarCheck,
  ChevronRight,
  Clock3,
  Compass,
  MapPin,
  Menu,
  Route,
  Search,
  Ship,
  Sparkles,
  Star,
  Store,
  Umbrella,
  UserRound,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

import type { ConceptHomeData } from "@/components/homepage-concepts/data";
import styles from "@/components/homepage-concepts/sunlit-field-guide.module.css";
import {
  categoryLabels,
  type DiscoveryListing,
} from "@/modules/listings/search";

const categoryLinks = [
  {
    href: "/search?category=resort",
    label: "Beach stays",
    detail: "Day-use and overnight",
    icon: Waves,
  },
  {
    href: "/search?category=restaurant",
    label: "Eat & drink",
    detail: "Neighbourhood favourites",
    icon: UtensilsCrossed,
  },
  {
    href: "/search?category=activity",
    label: "Tours & activities",
    detail: "Made for island time",
    icon: Compass,
  },
  {
    href: "/search?category=room",
    label: "City stays",
    detail: "Close to where you need to be",
    icon: BedDouble,
  },
] as const;

const placeFallbacks = [
  {
    image: "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
    name: "A quiet Samal shoreline",
    location: "Samal Island",
    note: "Beach day",
  },
  {
    image: "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
    name: "A taste of Davao",
    location: "Davao City",
    note: "Local food",
  },
  {
    image: "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
    name: "Island hopping from the coast",
    location: "Island Garden City of Samal",
    note: "On the water",
  },
] as const;

const localSpotlights = [
  {
    eyebrow: "Island pace",
    title: "Samal, slowly",
    copy: "Beach stays, day-use escapes, and plans that leave room for the crossing.",
    cta: "Browse Samal stays",
    href: "/search?area=samal",
    image: "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
    className: "island",
  },
  {
    eyebrow: "City appetite",
    title: "Davao between meals",
    copy: "Coffee, durian, and neighbourhood tables worth building a day around.",
    cta: "Browse food places",
    href: "/search?area=davao-city&category=restaurant",
    image: "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
    className: "city",
  },
  {
    eyebrow: "Know before you go",
    title: "Crossing notes",
    copy: "Ferry context, practical timing, and the small details locals remember.",
    cta: "Open route guide",
    href: "/transport",
    image: "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
    className: "route",
  },
] as const;

export function SunlitFieldGuide({
  data,
  withChrome = true,
}: {
  data: ConceptHomeData;
  withChrome?: boolean;
}) {
  const listings = data.featuredListings.slice(0, 3);
  const guide = data.collections[0];
  const ferry = data.ferries[0];
  const route = data.routes[0];
  const claimListing =
    data.listings.find((listing) => listing.claimStatus === "unclaimed") ??
    data.listings[0];
  const claimHref = claimListing
    ? `/portal/claims/new?listing=${encodeURIComponent(claimListing.slug)}`
    : "/portal/claims/new";

  const content = (
    <>
        <section className={styles.hero}>
          <div aria-hidden="true" className={styles.sunWash} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Local discovery, planned well</p>
              <h1>
                Find the place.
                <em>Know the way.</em>
              </h1>
              <p className={styles.heroBody}>
                Compare local places, real rates, booking mode, and route
                context before you commit to the day.
              </p>

              <div className={styles.mobileHeroVisual}>
                <div className={styles.mobileHeroImage}>
                  <Image
                    alt="A sunlit coastal escape"
                    fill
                    priority
                    sizes="100vw"
                    src="/homepage-concepts/shared-photography/samal-shore-desktop.webp"
                  />
                </div>
                <RouteProof ferry={ferry} />
              </div>

              <form
                action="/search"
                className={styles.searchDeck}
                method="get"
                role="search"
              >
                <label className={styles.searchField}>
                  <span className={styles.srOnly}>
                    Search places and experiences
                  </span>
                  <Search aria-hidden="true" />
                  <input
                    autoComplete="off"
                    name="q"
                    placeholder="Try beach, brunch, or day use..."
                    spellCheck={false}
                    type="search"
                  />
                </label>
                <label className={styles.locationField}>
                  <span>Where</span>
                  <select defaultValue="" name="location">
                    <option value="">All locations</option>
                    <option value="Davao City">Davao City</option>
                    <option value="Samal">Samal Island</option>
                    <option value="Davao del Sur">Davao del Sur</option>
                  </select>
                </label>
                <label className={styles.categoryField}>
                  <span>What</span>
                  <select defaultValue="" name="category">
                    <option value="">Anything local</option>
                    <option value="resort">Beach stay</option>
                    <option value="restaurant">Food & drink</option>
                    <option value="activity">Experience</option>
                    <option value="room">City stay</option>
                  </select>
                </label>
                <button className={styles.searchButton} type="submit">
                  <span>Search</span>
                  <ArrowRight aria-hidden="true" />
                </button>
              </form>

              <nav
                aria-label="Popular searches"
                className={styles.quickSearches}
              >
                <span>Try:</span>
                <Link href="/search?q=day+use">Day-use spots</Link>
                <Link href="/search?category=restaurant">Food crawl</Link>
              </nav>
            </div>

            <figure className={styles.heroVisual}>
              <div className={styles.heroFrame}>
                <div className={styles.heroMainImage}>
                  <Image
                    alt="A sunlit coastal escape"
                    fill
                    priority
                    sizes="(min-width: 960px) 47vw, 100vw"
                    src="/homepage-concepts/shared-photography/samal-shore-desktop.webp"
                  />
                </div>
                <svg
                  aria-hidden="true"
                  className={styles.routeThread}
                  fill="none"
                  viewBox="0 0 320 64"
                >
                  <path
                    d="M16 40 C 110 8, 210 8, 304 40"
                    stroke="rgba(255, 255, 255, 0.74)"
                    strokeDasharray="6 8"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <circle
                    className={styles.routeDot}
                    cx="16"
                    cy="40"
                    fill="var(--sfg-coral)"
                    r="6"
                    stroke="rgba(255, 250, 242, 0.95)"
                    strokeWidth="4"
                  />
                  <circle
                    className={`${styles.routeDot} ${styles.routeDotPulse}`}
                    cx="160"
                    cy="16"
                    fill="var(--sfg-coral)"
                    r="6"
                    stroke="rgba(255, 250, 242, 0.95)"
                    strokeWidth="4"
                  />
                  <circle
                    className={styles.routeDot}
                    cx="304"
                    cy="40"
                    fill="var(--sfg-sun)"
                    r="6"
                    stroke="rgba(255, 250, 242, 0.95)"
                    strokeWidth="4"
                  />
                </svg>
              </div>
              <RouteProof ferry={ferry} />
            </figure>
          </div>
        </section>

        <section aria-label="Browse by category" className={styles.categoryBar}>
          <div className={styles.categoryInner}>
            <p>
              <Compass aria-hidden="true" />
              Start with a category
            </p>
            <nav className={styles.categoryLinks}>
              {categoryLinks.map((category) => {
                const Icon = category.icon;

                return (
                  <Link href={category.href} key={category.label}>
                    <Icon aria-hidden="true" />
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.detail}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <section
          aria-labelledby="local-lens-title"
          className={`${styles.section} ${styles.localLensSection}`}
        >
          <div className={styles.container}>
            <div className={styles.localLensHeader}>
              <div>
                <p>
                  <MapPin aria-hidden="true" />
                  The local lens
                </p>
                <h2 id="local-lens-title">
                  Find the version of Davao that fits your day.
                </h2>
              </div>
              <p>
                Less generic travel inspiration, more useful starting points -
                city appetite to island pace.
              </p>
            </div>

            <div className={styles.localSpotlightGrid}>
              {localSpotlights.map((spotlight, index) => (
                <Link
                  className={styles.localSpotlight}
                  data-featured={index === 0 || undefined}
                  data-variant={spotlight.className}
                  href={spotlight.href}
                  key={spotlight.title}
                >
                  <Image
                    alt=""
                    fill
                    loading="lazy"
                    sizes={
                      index === 0
                        ? "(min-width: 900px) 58vw, 100vw"
                        : "(min-width: 900px) 29vw, 100vw"
                    }
                    src={spotlight.image}
                  />
                  <span className={styles.localSpotlightShade} />
                  <div className={styles.localSpotlightCopy}>
                    <span>{spotlight.eyebrow}</span>
                    <h3>{spotlight.title}</h3>
                    <p>{spotlight.copy}</p>
                    <strong>
                      {spotlight.cta}
                      <ArrowRight aria-hidden="true" />
                    </strong>
                  </div>
                </Link>
              ))}
            </div>

            <div className={styles.localNeighbourhoods}>
              <span>Browse nearby:</span>
              <Link href="/search?area=davao-city&q=downtown">
                Downtown Davao
              </Link>
              <Link href="/search?area=davao-city&q=lanang">Lanang</Link>
              <Link href="/search?area=samal&q=babak">Babak</Link>
              <Link href="/search?area=samal&q=kaputian">Kaputian</Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="field-guide-places"
          className={`${styles.section} ${styles.placesSection}`}
        >
          <div className={styles.container}>
            <SectionHeading
              eyebrow="Ready to compare"
              id="field-guide-places"
              title="Stay somewhere that fits the plan."
            >
              Compare prices, booking mode, trust cues, review context, and the
              shape of the trip before you leave the homepage.
            </SectionHeading>

            <div className={styles.placesGrid}>
              {placeFallbacks.map((fallback, index) => (
                <PlaceCard
                  fallback={fallback}
                  featured={false}
                  key={listings[index]?.id ?? fallback.name}
                  listing={listings[index]}
                />
              ))}
            </div>

            <div className={styles.sectionAction}>
              <Link href="/search">
                Browse all places
                <ArrowRight aria-hidden="true" />
              </Link>
              <p>
                Filter by price, booking mode, amenities, and crowd pattern.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="field-guide-plan"
          className={`${styles.section} ${styles.planSection}`}
          id="day-plan"
        >
          <div className={styles.container}>
            <SectionHeading
              eyebrow="A day that makes sense"
              id="field-guide-plan"
              inverse
              title="Save the places. We'll help connect the dots."
            >
              Turn a shortlist into a realistic day with travel time, route
              notes, and space to slow down.
            </SectionHeading>

            <div className={styles.planBoard}>
              <div className={styles.timeline}>
                <div className={styles.timelineHeader}>
                  <span>Sample island day</span>
                  <strong>3 stops / 8 hours</strong>
                </div>
                <ol>
                  <TimelineStop
                    icon={Ship}
                    meta="Ferry crossing / around 20 min"
                    number="01"
                    time="08:00"
                    title={ferry?.routeName ?? "Davao-Samal ferry"}
                  />
                  <TimelineStop
                    icon={Umbrella}
                    meta="Day use / allow 4 hours"
                    number="02"
                    time="09:15"
                    title={listings[0]?.name ?? "Beach stop on Samal"}
                  />
                  <TimelineStop
                    icon={UtensilsCrossed}
                    meta="Lunch / book ahead on weekends"
                    number="03"
                    time="14:00"
                    title={listings[1]?.name ?? "A late local lunch"}
                  />
                </ol>
                <Link className={styles.addStop} href="/search">
                  <span>+</span>
                  Find another stop
                </Link>
              </div>

              <aside className={styles.routeCard}>
                <div className={styles.routeCardTop}>
                  <Route aria-hidden="true" />
                  <span>Route check</span>
                </div>
                <p className={styles.routeLabel}>A useful first route</p>
                <h3>{route?.name ?? "City center to the Samal ferry"}</h3>
                <div className={styles.routeMetrics}>
                  <div>
                    <Clock3 aria-hidden="true" />
                    <span>Travel window</span>
                    <strong>45-70 min</strong>
                  </div>
                  <div>
                    <BusFront aria-hidden="true" />
                    <span>Public transport</span>
                    <strong>
                      {formatFareRange(route?.fareMin, route?.fareMax)}
                    </strong>
                  </div>
                </div>
                <p className={styles.routeNotice}>
                  Schedules and fares can change. Confirm current information
                  with the operator before leaving.
                </p>
                <Link href="/transport">
                  Open route guide
                  <ArrowRight aria-hidden="true" />
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="field-notes-title"
          className={`${styles.section} ${styles.notesSection}`}
          id="field-notes"
        >
          <div className={styles.container}>
            <div className={styles.notesGrid}>
              <article className={styles.guideFeature}>
                <div className={styles.guideImage}>
                  <Image
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(min-width: 800px) 48vw, 100vw"
                    src={
                      guide?.coverImage ??
                      "/homepage-concepts/shared-photography/samal-dock-desktop.webp"
                    }
                  />
                </div>
                <div className={styles.guideCopy}>
                  <p className={styles.paperEyebrow}>Field note no. 04</p>
                  <h2 id="field-notes-title">
                    {guide?.title ?? "A practical first day on Samal"}
                  </h2>
                  <p>
                    {guide?.description ??
                      "A gentle route through beach time, a local lunch, and the ride back to Davao."}
                  </p>
                  <Link
                    href={
                      guide
                        ? `/collections/${guide.slug}`
                        : "/search?area=samal"
                    }
                  >
                    Read the local guide
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </article>

              <aside className={styles.notesAside}>
                <p className={styles.paperEyebrow}>Good to know</p>
                <h3>Small details make an easier trip.</h3>
                <ul>
                  <li>
                    <span>01</span>
                    <div>
                      <strong>Keep a cash buffer</strong>
                      <p>
                        Some local routes and small operators are cash-first.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>Check the last crossing</strong>
                      <p>
                        Build the return ferry into the day before you book.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>Ask before you go</strong>
                      <p>Use the place page for the latest contact details.</p>
                    </div>
                  </li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className={styles.transportRibbon}>
          <div className={styles.transportInner}>
            <div className={styles.transportIcon}>
              <Ship aria-hidden="true" />
            </div>
            <div>
              <p>Need route details?</p>
              <h2>Check the latest crossing before you go.</h2>
            </div>
            <Link href="/transport">
              Open route guide
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.ownerSection}>
          <div className={styles.ownerInner}>
            <Store aria-hidden="true" />
            <div>
              <p>For local owners</p>
              <h2>Make your place easier to find and easier to trust.</h2>
            </div>
            <div className={styles.ownerActions}>
              <Link href={claimHref}>Claim your listing</Link>
              <Link href="/portal">Owner portal</Link>
            </div>
          </div>
        </section>
    </>
  );

  if (!withChrome) {
    return content;
  }

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <FieldGuideHeader />
      <main id="main-content">{content}</main>
      <FieldGuideFooter claimHref={claimHref} />
    </div>
  );
}

function FieldGuideHeader() {
  return (
    <header className={styles.header}>
      <nav aria-label="Primary navigation" className={styles.headerInner}>
        <Link
          aria-label="Sunlit Field Guide concept home"
          className={styles.brand}
          href="/homepage-concepts/sunlit-field-guide"
          translate="no"
        >
          <span aria-hidden="true" className={styles.brandMark}>
            <Compass />
          </span>
          <span>Pasadya</span>
          <small>Field guide</small>
        </Link>

        <div className={styles.desktopNav}>
          <Link href="/search">Explore</Link>
          <Link href="/transport">Routes</Link>
        </div>

        <div className={styles.headerActions}>
          <Link className={styles.savedLink} href="/account">
            <Bookmark aria-hidden="true" />
            Saved
          </Link>
          <Link className={styles.headerCta} href="/account">
            Account
            <UserRound aria-hidden="true" />
          </Link>
        </div>

        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation">
            <Menu aria-hidden="true" />
          </summary>
          <nav aria-label="Mobile menu">
            <Link href="/search">
              Explore
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/homepage-concepts/sunlit-field-guide#day-plan">
              Plan a day
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/homepage-concepts/sunlit-field-guide#field-notes">
              Local guides
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/transport">
              Routes
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/account">
              Saved & account
              <ChevronRight aria-hidden="true" />
            </Link>
          </nav>
        </details>
      </nav>
    </header>
  );
}

function RouteProof({
  ferry,
}: {
  ferry: ConceptHomeData["ferries"][number] | undefined;
}) {
  const duration = ferry?.durationMinutes ?? 20;
  const routeName = ferry
    ? `${ferry.origin} to ${ferry.destination}`
    : "Davao to Samal";

  return (
    <div className={styles.routeProof}>
      <Ship aria-hidden="true" />
      <span>{routeName}</span>
      <strong>{duration} min</strong>
      <span>{formatPrice(ferry?.fare)}</span>
    </div>
  );
}

function SectionHeading({
  children,
  eyebrow,
  id,
  inverse = false,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  id: string;
  inverse?: boolean;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading} data-inverse={inverse || undefined}>
      <div>
        <p>
          <Sparkles aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 id={id}>{title}</h2>
      </div>
      <div className={styles.sectionIntro}>
        <span aria-hidden="true">*</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

function PlaceCard({
  fallback,
  featured,
  listing,
}: {
  fallback: (typeof placeFallbacks)[number];
  featured: boolean;
  listing: DiscoveryListing | undefined;
}) {
  const href = listing ? `/place/${listing.slug}` : "/search";
  const image = listing?.media[0]?.url ?? fallback.image;
  const location = listing
    ? [listing.address.barangay, listing.address.municipality]
        .filter(Boolean)
        .join(", ") || "Davao region"
    : fallback.location;
  const card = cardPresentation(listing, fallback);

  return (
    <article className={styles.placeCard} data-featured={featured || undefined}>
      <div className={styles.placeImage}>
        <Link
          aria-label={`Open ${listing?.name ?? fallback.name}`}
          className={styles.placeImageLink}
          href={href}
        >
          <Image
            alt=""
            fill
            loading={featured ? "eager" : "lazy"}
            sizes={
              featured
                ? "(min-width: 900px) 55vw, 100vw"
                : "(min-width: 900px) 28vw, 100vw"
            }
            src={image}
          />
        </Link>
        <span className={styles.placeTag}>
          {listing ? categoryLabels[listing.category] : fallback.note}
        </span>
        <span className={styles.imageRating}>
          <Star aria-hidden="true" />
          {card.ratingLabel}
        </span>
        <Link
          aria-label="Open saved places in your account"
          className={styles.imageSave}
          href="/account"
          title="Open saved places"
        >
          <Bookmark aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.placeBody}>
        <div className={styles.placeMeta}>
          <span>
            <MapPin aria-hidden="true" />
            {location}
          </span>
        </div>
        <h3>
          <Link href={href}>{listing?.name ?? fallback.name}</Link>
        </h3>
        <ul aria-label="Place context" className={styles.placeSignals}>
          <li>
            <CalendarCheck aria-hidden="true" />
            {card.bookingLabel}
          </li>
          <li>
            <BadgeCheck aria-hidden="true" />
            {card.trustLabel}
          </li>
        </ul>
        <div className={styles.placeFooter}>
          <div>
            <span>{card.priceLabel}</span>
            <strong>{card.priceValue}</strong>
          </div>
          <div className={styles.placeActions}>
            <Link aria-label={`Open ${listing?.name ?? fallback.name}`} href={href}>
              Open
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function TimelineStop({
  icon: Icon,
  meta,
  number,
  time,
  title,
}: {
  icon: typeof Ship;
  meta: string;
  number: string;
  time: string;
  title: string;
}) {
  return (
    <li>
      <time dateTime={time}>{time}</time>
      <span className={styles.timelineDot}>{number}</span>
      <div className={styles.timelineStop}>
        <Icon aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          <span className={styles.timelineMobileTime}>{time}</span>
          <span>{meta}</span>
        </div>
      </div>
    </li>
  );
}

function FieldGuideFooter({ claimHref }: { claimHref: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerWordmark}>Pasadya</div>
          <p>
            Madayaw. Find local places, honest details, and practical routes for
            days around Davao and Samal.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <div>
            <strong>Explore</strong>
            <Link href="/search">Find places</Link>
            <Link href="/transport">Transport</Link>
            <Link href="/homepage-concepts">Concept gallery</Link>
          </div>
          <div>
            <strong>For owners</strong>
            <Link href={claimHref}>Claim a listing</Link>
            <Link href="/portal">Owner portal</Link>
          </div>
          <div>
            <strong>Information</strong>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
          </div>
        </nav>
      </div>
      <div className={styles.footerMeta}>
        <span>Sunlit Field Guide | Private homepage concept</span>
        <span>Made for bright days and practical plans.</span>
      </div>
    </footer>
  );
}

function cardPresentation(
  listing: DiscoveryListing | undefined,
  fallback: (typeof placeFallbacks)[number],
) {
  const rate = listing?.ratePlans[0];
  const amount = rate?.price ?? listing?.priceMin ?? null;
  const municipality = listing?.address.municipality ?? fallback.location;

  return {
    bookingLabel: formatBookingLabel(listing),
    crowdLabel: formatCrowdLabel(listing),
    priceLabel: rate?.priceUnit
      ? `Published rate / ${formatRateUnit(rate.priceUnit)}`
      : "Starting rate",
    priceValue: amount === null ? "Ask for rates" : formatPrice(amount),
    ratingLabel:
      listing?.ratingCount && listing.ratingCount > 0
        ? `${listing.ratingAvg.toFixed(1)} / ${compactCount(listing.ratingCount)}`
        : "Local pick",
    reviewLabel:
      listing?.ratingCount && listing.ratingCount > 0
        ? `${listing.ratingCount.toLocaleString("en-PH")} reviews`
        : "No reviews yet",
    routeLabel: /samal/i.test(municipality)
      ? "Allow for ferry timing"
      : "Good city jump-off",
    trustLabel:
      listing?.claimStatus === "claimed"
        ? "Verified owner listing"
        : listing?.dotAccredited
          ? "DOT accredited"
          : "Local listing",
  };
}

function formatBookingLabel(listing: DiscoveryListing | undefined) {
  if (!listing) return "Details before booking";
  if (listing.bookingMode === "instant") return "Instant booking available";
  if (listing.bookingMode === "inquiry") return "Request before booking";
  return "Details before booking";
}

function formatCrowdLabel(listing: DiscoveryListing | undefined) {
  const level = listing?.attributes.crowd_level;
  const source = String(listing?.attributes.crowd_source ?? "").toLowerCase();
  if (!level && !source) return null;

  const label =
    level === "quiet"
      ? "usually quieter"
      : level === "busy"
        ? "usually busy"
        : level === "full"
          ? "often full"
          : "usually moderate";

  if (/business|owner/.test(source)) return `Owner-reported crowd: ${label}`;
  if (/community/.test(source)) return `Community-reported crowd: ${label}`;
  return `Typical crowd: ${label}`;
}

function formatRateUnit(unit: string) {
  switch (unit) {
    case "per_night":
      return "per night";
    case "per_person":
      return "per person";
    case "per_group":
      return "per group";
    case "flat":
      return "flat rate";
    default:
      return unit.replaceAll("_", " ");
  }
}

function compactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return value.toString();
}

function formatPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return "Confirm fare";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price / 100);
}

function formatFareRange(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (min == null && max == null) return "Confirm fare";
  if (min == null) return `Up to ${formatPrice(max)}`;
  if (max == null || min === max) return formatPrice(min);
  return `${formatPrice(min)}-${formatPrice(max)}`;
}

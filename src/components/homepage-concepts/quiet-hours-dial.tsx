"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  MapPin,
  Search,
  SunMedium,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import type {
  DiscoveryListing,
  ListingCategory,
} from "@/modules/listings/search";

type DaypartId = "morning" | "afternoon" | "evening";

type Daypart = {
  id: DaypartId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  order: readonly ListingCategory[];
  icon: typeof Sunrise;
};

type QuietPalette = CSSProperties & {
  "--qh-bg": string;
  "--qh-card": string;
  "--qh-ink": string;
  "--qh-muted": string;
  "--qh-accent": string;
  "--qh-accent-ink": string;
  "--qh-soft": string;
  "--qh-line": string;
};

const DAYPARTS: readonly Daypart[] = [
  {
    id: "morning",
    label: "Morning",
    eyebrow: "A softer beginning",
    title: "Start gently.",
    description:
      "Food leads the edit, followed by unhurried activities and places to settle in.",
    order: ["restaurant", "activity", "resort", "room", "service"],
    icon: Sunrise,
  },
  {
    id: "afternoon",
    label: "Afternoon",
    eyebrow: "Room for a detour",
    title: "Follow the light.",
    description:
      "Activities and resort ideas come forward, with a good table kept close behind.",
    order: ["activity", "resort", "restaurant", "service", "room"],
    icon: SunMedium,
  },
  {
    id: "evening",
    label: "Evening",
    eyebrow: "An easy last chapter",
    title: "Stay a little.",
    description:
      "Dining and stays take the lead, leaving space for one more local experience.",
    order: ["restaurant", "room", "resort", "activity", "service"],
    icon: Sunset,
  },
] as const;

const PALETTES: Record<DaypartId, QuietPalette> = {
  morning: {
    "--qh-bg": "#E8E6FF",
    "--qh-card": "#F8F7FF",
    "--qh-ink": "#152653",
    "--qh-muted": "#4D5878",
    "--qh-accent": "#315BCB",
    "--qh-accent-ink": "#FFFFFF",
    "--qh-soft": "#C9D4FF",
    "--qh-line": "rgba(21, 38, 83, 0.22)",
  },
  afternoon: {
    "--qh-bg": "#F3E8CE",
    "--qh-card": "#FFF9ED",
    "--qh-ink": "#10265F",
    "--qh-muted": "#505A70",
    "--qh-accent": "#1748C8",
    "--qh-accent-ink": "#FFFFFF",
    "--qh-soft": "#D7D8FF",
    "--qh-line": "rgba(16, 38, 95, 0.22)",
  },
  evening: {
    "--qh-bg": "#0B1735",
    "--qh-card": "#14264D",
    "--qh-ink": "#FFF4E8",
    "--qh-muted": "#C7CBD8",
    "--qh-accent": "#FF806F",
    "--qh-accent-ink": "#25182D",
    "--qh-soft": "#314878",
    "--qh-line": "rgba(255, 244, 232, 0.24)",
  },
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  resort: "Resort",
  room: "Stay",
  restaurant: "Food",
  activity: "Activity",
  service: "Service",
};

const TAB_POSITIONS = [
  "left-[1%] top-[12%] sm:left-[3%]",
  "right-[1%] top-[12%] sm:right-[3%]",
  "bottom-[4%] left-1/2 -translate-x-1/2",
] as const;

export function QuietHoursDial({ listings }: { listings: DiscoveryListing[] }) {
  const [activeId, setActiveId] = useState<DaypartId>("morning");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const idPrefix = useId();
  const activeIndex = DAYPARTS.findIndex((item) => item.id === activeId);
  const activeDaypart = DAYPARTS[activeIndex] ?? DAYPARTS[0];
  const ActiveIcon = activeDaypart.icon;
  const activeRecommendations = rankListings(listings, activeDaypart);

  function selectTab(index: number, moveFocus = false) {
    const nextDaypart = DAYPARTS[index];

    if (!nextDaypart) return;
    setActiveId(nextDaypart.id);

    if (moveFocus) {
      tabRefs.current[index]?.focus();
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % DAYPARTS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + DAYPARTS.length) % DAYPARTS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = DAYPARTS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectTab(nextIndex, true);
    }
  }

  return (
    <section
      aria-labelledby="quiet-hours-title"
      className="qh-motion relative overflow-hidden bg-[var(--qh-bg)] text-[var(--qh-ink)] transition-colors duration-700 motion-reduce:transition-none"
      style={PALETTES[activeId]}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
          activeId === "evening"
            ? "opacity-[0.32]"
            : "opacity-[0.18] mix-blend-multiply"
        }`}
      >
        <ResponsiveHeroArt
          className="object-cover object-[62%_center] lg:object-right"
          desktopSrc="/homepage-concepts/shared-photography/davao-sunset-desktop.webp"
          mobileSrc="/homepage-concepts/shared-photography/davao-sunset-mobile.webp"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--qh-bg)_0%,transparent_48%,var(--qh-bg)_100%)] lg:bg-[linear-gradient(90deg,var(--qh-bg)_0%,var(--qh-bg)_45%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-[var(--qh-soft)] opacity-45 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-12 lg:pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,.9fr)_minmax(430px,1.1fr)] lg:items-center lg:gap-12">
          <div className="max-w-2xl">
            <p className="inline-flex min-h-11 items-center rounded-full border border-[var(--qh-line)] bg-[var(--qh-card)]/85 px-4 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[var(--qh-accent)] backdrop-blur-md">
              Private preview · Davao + Samal
            </p>
            <h1
              className="mt-6 max-w-3xl text-[clamp(3.65rem,8vw,7.8rem)] font-medium leading-[0.78] tracking-[-0.055em] [font-family:var(--font-quiet-hours-display)]"
              id="quiet-hours-title"
            >
              Make time
              <span className="block italic text-[var(--qh-accent)]">
                feel like yours.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-7 text-[var(--qh-muted)] sm:text-lg sm:leading-8">
              A calm local concierge for choosing a place by the shape of your
              day—not by a ticking clock.
            </p>

            <form
              action="/search"
              className="mt-8 rounded-[1.5rem] border border-[var(--qh-line)] bg-[var(--qh-card)]/95 p-2 shadow-[0_24px_70px_rgba(11,23,53,0.16)] backdrop-blur-xl sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              method="get"
              role="search"
            >
              <label className="block min-w-0 px-2 pb-2 pt-1 sm:pb-1">
                <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[var(--qh-muted)]">
                  Search places directly
                </span>
                <span className="relative mt-1 block">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qh-accent)]"
                  />
                  <input
                    autoComplete="off"
                    className="min-h-12 w-full rounded-xl bg-transparent py-3 pl-9 pr-3 text-base font-semibold text-[var(--qh-ink)] outline-none placeholder:font-medium placeholder:text-[var(--qh-muted)] focus-visible:ring-2 focus-visible:ring-[var(--qh-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qh-card)]"
                    name="q"
                    placeholder="A quiet beach, dinner, a city stay…"
                    spellCheck={false}
                    type="search"
                  />
                </span>
              </label>
              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[var(--qh-accent)] px-5 text-sm font-extrabold text-[var(--qh-accent-ink)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--qh-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qh-card)] motion-reduce:transform-none motion-reduce:transition-none sm:w-auto"
                type="submit"
              >
                <Compass aria-hidden="true" className="h-4 w-4" />
                Find a place
              </button>
            </form>
            <p className="mt-3 text-xs font-semibold leading-5 text-[var(--qh-muted)]">
              The dial is an editorial filter, not opening-hours, availability,
              or live schedule data.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[32rem]">
            <p className="mb-3 text-center text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[var(--qh-muted)]">
              Choose a chapter · arrow keys also work
            </p>
            <div
              aria-label="Choose a daypart"
              aria-orientation="horizontal"
              className="relative aspect-square rounded-full border border-[var(--qh-line)] bg-[var(--qh-card)]/40 p-5 shadow-[0_32px_90px_rgba(11,23,53,0.2)] backdrop-blur-md"
              role="tablist"
            >
              <div
                aria-hidden="true"
                className="absolute inset-[7%] rounded-full border border-dashed border-[var(--qh-line)]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-[13%] rounded-full opacity-55"
                style={{
                  background:
                    "conic-gradient(from 220deg, var(--qh-soft), transparent 30%, var(--qh-accent) 50%, transparent 72%, var(--qh-soft))",
                }}
              />

              {DAYPARTS.map((daypart, index) => {
                const isActive = daypart.id === activeId;
                const Icon = daypart.icon;

                return (
                  <button
                    aria-controls={`${idPrefix}-panel-${daypart.id}`}
                    aria-selected={isActive}
                    className={`absolute z-20 inline-flex min-h-14 w-[7.35rem] items-center justify-center gap-2 rounded-full border px-3 text-sm font-extrabold outline-none transition-[background-color,color,box-shadow] duration-300 focus-visible:ring-4 focus-visible:ring-[var(--qh-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--qh-bg)] motion-reduce:transition-none sm:w-[8.4rem] ${TAB_POSITIONS[index]} ${
                      isActive
                        ? "border-transparent bg-[var(--qh-accent)] text-[var(--qh-accent-ink)] shadow-[0_12px_30px_rgba(11,23,53,.22)]"
                        : "border-[var(--qh-line)] bg-[var(--qh-card)] text-[var(--qh-ink)] hover:border-[var(--qh-accent)]"
                    }`}
                    id={`${idPrefix}-tab-${daypart.id}`}
                    key={daypart.id}
                    onClick={() => selectTab(index)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    role="tab"
                    tabIndex={isActive ? 0 : -1}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {daypart.label}
                  </button>
                );
              })}

              <div
                aria-hidden="true"
                className="absolute inset-[23%] z-10 grid place-items-center rounded-full border border-[var(--qh-line)] bg-[var(--qh-card)] text-center shadow-[inset_0_0_0_10px_var(--qh-bg)] sm:inset-[24%]"
              >
                <div className="px-4">
                  <ActiveIcon className="mx-auto h-6 w-6 text-[var(--qh-accent)] sm:h-7 sm:w-7" />
                  <span className="mt-2 block text-[0.58rem] font-extrabold uppercase tracking-[0.18em] text-[var(--qh-muted)] sm:text-[0.65rem]">
                    Selected edit
                  </span>
                  <strong className="mt-1 block text-3xl font-medium leading-none [font-family:var(--font-quiet-hours-display)] sm:text-5xl">
                    {activeDaypart.label}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--qh-line)] pt-8 sm:mt-12 sm:pt-10">
          {DAYPARTS.map((daypart) => {
            const isActive = daypart.id === activeId;
            const recommendations = rankListings(listings, daypart);

            return (
              <div
                aria-labelledby={`${idPrefix}-tab-${daypart.id}`}
                hidden={!isActive}
                id={`${idPrefix}-panel-${daypart.id}`}
                key={daypart.id}
                role="tabpanel"
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(240px,.55fr)_minmax(0,1.45fr)] lg:items-start">
                  <div>
                    <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[var(--qh-accent)]">
                      {daypart.eyebrow}
                    </p>
                    <h2 className="mt-2 text-4xl font-medium leading-none [font-family:var(--font-quiet-hours-display)] sm:text-5xl">
                      {daypart.title}
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-[var(--qh-muted)]">
                      {daypart.description}
                    </p>
                  </div>

                  {recommendations.length > 0 ? (
                    <ol className="grid gap-3 sm:grid-cols-3">
                      {recommendations.map((listing, index) => (
                        <li key={listing.id}>
                          <Link
                            className="group flex min-h-[9.25rem] h-full flex-col justify-between rounded-[1.25rem] border border-[var(--qh-line)] bg-[var(--qh-card)] p-4 outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[var(--qh-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--qh-bg)] motion-reduce:transform-none motion-reduce:transition-none"
                            href={`/place/${listing.slug}`}
                          >
                            <span className="flex items-center justify-between gap-4">
                              <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--qh-accent)]">
                                {String(index + 1).padStart(2, "0")} ·{" "}
                                {CATEGORY_LABELS[listing.category]}
                              </span>
                              <ArrowUpRight
                                aria-hidden="true"
                                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                              />
                            </span>
                            <span>
                              <span className="block text-lg font-extrabold leading-snug">
                                {listing.name}
                              </span>
                              <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--qh-muted)]">
                                <MapPin
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                                {listingLocation(listing)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="rounded-[1.25rem] border border-[var(--qh-line)] bg-[var(--qh-card)] p-6">
                      <p className="text-sm leading-6 text-[var(--qh-muted)]">
                        No published places are in this preview yet.
                      </p>
                      <Link
                        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[var(--qh-accent)] outline-none underline decoration-current/35 underline-offset-4 focus-visible:ring-2 focus-visible:ring-[var(--qh-accent)]"
                        href="/search"
                      >
                        Search the full directory
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p aria-atomic="true" aria-live="polite" className="sr-only">
          {activeDaypart.label} selected. {activeRecommendations.length}{" "}
          published place recommendations shown. Recommendations are
          category-based, not live schedule or availability information.
        </p>
      </div>
      <style>{quietHoursDialStyles}</style>
    </section>
  );
}

function rankListings(listings: DiscoveryListing[], daypart: Daypart) {
  const priority = new Map(
    daypart.order.map((category, index) => [category, index]),
  );

  return [...listings]
    .sort((left, right) => {
      const categoryDifference =
        (priority.get(left.category) ?? daypart.order.length) -
        (priority.get(right.category) ?? daypart.order.length);

      if (categoryDifference !== 0) return categoryDifference;
      if (left.slug === right.slug) return 0;
      return left.slug < right.slug ? -1 : 1;
    })
    .slice(0, 3);
}

function listingLocation(listing: DiscoveryListing) {
  return (
    listing.address.municipality ??
    listing.address.barangay ??
    listing.address.province ??
    "Davao region"
  );
}

const quietHoursDialStyles = String.raw`
  @media (prefers-reduced-motion: reduce) {
    .qh-motion,
    .qh-motion * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

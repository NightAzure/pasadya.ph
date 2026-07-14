"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Star,
  UsersRound,
} from "lucide-react";

import type { DiscoveryListing } from "@/modules/listings/search";

const CATEGORY_LABELS: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food",
  activity: "Activity",
  service: "Service",
};

const ACCENTS = ["#FF574A", "#B8D9FF", "#F4F26A"] as const;

const FALLBACK_IMAGES = [
  "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
  "/homepage-concepts/shared-photography/davao-aerial-desktop.webp",
  "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
  "/homepage-concepts/shared-photography/davao-sunset-desktop.webp",
] as const;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function AfterglowReel({ listings }: { listings: DiscoveryListing[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (listings.length === 0) {
    return <ReelEmptyState />;
  }

  const activeListing = listings[activeIndex] ?? listings[0];
  const activeMedia = activeListing.media[0];
  const accent = ACCENTS[activeIndex % ACCENTS.length];
  const imageSrc =
    activeMedia?.url ?? FALLBACK_IMAGES[activeIndex % FALLBACK_IMAGES.length];
  const tabId = `afterglow-tab-${activeListing.id}`;
  const location = formatLocation(activeListing);
  const crowd = getCrowdCopy(activeListing);
  const accentStyle = { "--afterglow-active": accent } as CSSProperties;

  function selectIndex(index: number, moveFocus = false) {
    const nextIndex = (index + listings.length) % listings.length;
    setActiveIndex(nextIndex);
    if (moveFocus) {
      tabRefs.current[nextIndex]?.focus();
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectIndex(index + 1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectIndex(index - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectIndex(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectIndex(listings.length - 1, true);
    }
  }

  return (
    <div
      aria-label="Featured places story reel"
      className="overflow-hidden border-2 border-[#401421] bg-[#401421] shadow-[8px_8px_0_#FF574A] sm:shadow-[12px_12px_0_#FF574A]"
      style={accentStyle}
    >
      <div
        aria-labelledby={tabId}
        className="grid bg-[var(--afterglow-active)] transition-colors duration-300 motion-reduce:transition-none lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]"
        id="afterglow-active-panel"
        role="tabpanel"
        tabIndex={0}
      >
        <div className="relative min-h-[350px] overflow-hidden border-b-2 border-[#401421] sm:min-h-[520px] lg:min-h-[650px] lg:border-b-0 lg:border-r-2">
          <Image
            alt={
              activeMedia?.caption ?? (activeMedia ? activeListing.name : "")
            }
            className="object-cover transition-transform duration-500 motion-reduce:transition-none"
            fill
            priority={false}
            sizes="(min-width: 1024px) 68vw, 100vw"
            src={imageSrc}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#401421]/85 via-transparent to-[#401421]/10" />
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
            <span className="inline-flex min-h-11 items-center border-2 border-[#401421] bg-[#FFF7ED] px-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#401421] shadow-[3px_3px_0_#401421]">
              Now showing
            </span>
            <span className="inline-flex min-h-11 items-center bg-[#401421] px-4 text-xs font-bold uppercase tracking-[0.14em] text-[#FFF7ED]">
              {CATEGORY_LABELS[activeListing.category]}
            </span>
          </div>
          <p
            aria-live="polite"
            className="absolute bottom-5 left-5 right-5 text-sm font-bold text-[#FFF7ED] sm:bottom-7 sm:left-7 sm:right-7"
          >
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(listings.length).padStart(2, "0")} · {activeListing.name}
          </p>
        </div>

        <div className="flex min-w-0 flex-col p-5 text-[#401421] sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-5">
            <p
              aria-hidden="true"
              className="text-[4.75rem] font-black leading-none tracking-[-0.08em] text-[#401421]/15 sm:text-[6.5rem] [font-family:var(--font-afterglow-display)]"
            >
              {String(activeIndex + 1).padStart(2, "0")}
            </p>
            <div className="flex gap-2">
              <button
                aria-label="Show previous place"
                className="inline-flex h-12 w-12 items-center justify-center border-2 border-[#401421] bg-[#FFF7ED] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[#FFF7ED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#401421] active:translate-y-0 motion-reduce:transform-none"
                onClick={() => selectIndex(activeIndex - 1)}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                aria-label="Show next place"
                className="inline-flex h-12 w-12 items-center justify-center border-2 border-[#401421] bg-[#FFF7ED] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[#FFF7ED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#401421] active:translate-y-0 motion-reduce:transform-none"
                onClick={() => selectIndex(activeIndex + 1)}
                type="button"
              >
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-7 lg:mt-auto">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {location}
            </p>
            <h3 className="mt-4 text-4xl font-black leading-[0.92] tracking-[-0.045em] sm:text-5xl [font-family:var(--font-afterglow-display)]">
              {activeListing.name}
            </h3>
            <p className="mt-5 line-clamp-4 text-sm font-semibold leading-6 text-[#401421]">
              {activeListing.description}
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-px border-2 border-[#401421] bg-[#401421] text-sm">
              <div className="bg-[#FFF7ED] p-4">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#401421]/75">
                  Starts at
                </dt>
                <dd className="mt-1 font-black">
                  {formatPrice(activeListing.priceMin)}
                </dd>
              </div>
              <div className="bg-[#FFF7ED] p-4">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#401421]/75">
                  Local signal
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 font-black">
                  {activeListing.ratingCount > 0 ? (
                    <>
                      <Star
                        aria-hidden="true"
                        className="h-4 w-4 fill-[#FF574A] text-[#FF574A]"
                      />
                      {activeListing.ratingAvg.toFixed(1)}
                    </>
                  ) : (
                    "New listing"
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex min-h-11 items-center gap-2 text-xs font-bold">
                <UsersRound aria-hidden="true" className="h-4 w-4" />
                {crowd}
              </span>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[#401421] bg-[#401421] px-5 text-sm font-extrabold text-[#FFF7ED] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[#FFF7ED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#401421] active:translate-y-0 motion-reduce:transform-none"
                href={`/place/${activeListing.slug}`}
              >
                See this place
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#401421] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-4 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#FFF7ED]/70">
          <p>Pick a story</p>
          <p className="hidden sm:block">Use arrow keys or swipe the lineup</p>
        </div>
        <div
          aria-label="Choose a featured place"
          className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-color:#FF574A_#401421] [scrollbar-width:thin]"
          role="tablist"
        >
          {listings.map((listing, index) => {
            const isActive = index === activeIndex;
            const listingMedia = listing.media[0];
            const thumbnail =
              listingMedia?.url ??
              FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];

            return (
              <button
                aria-controls="afterglow-active-panel"
                aria-selected={isActive}
                className="group flex min-h-[76px] w-[220px] shrink-0 snap-start items-center gap-3 border-2 border-[#FFF7ED]/30 bg-[#FFF7ED]/5 p-2 text-left text-[#FFF7ED] outline-none transition-[background-color,border-color] hover:border-[#FFF7ED] focus-visible:border-[#F4F26A] focus-visible:ring-2 focus-visible:ring-[#F4F26A] data-[active=true]:border-[var(--tab-accent)] data-[active=true]:bg-[#FFF7ED] data-[active=true]:text-[#401421] motion-reduce:transition-none sm:w-[250px]"
                data-active={isActive}
                id={`afterglow-tab-${listing.id}`}
                key={listing.id}
                onClick={() => selectIndex(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                style={
                  {
                    "--tab-accent": ACCENTS[index % ACCENTS.length],
                  } as CSSProperties
                }
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden border border-current/20 bg-[#FFF7ED]">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="56px"
                    src={thumbnail}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-65">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {CATEGORY_LABELS[listing.category]}
                  </span>
                  <span className="mt-1 block truncate text-sm font-extrabold">
                    {listing.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReelEmptyState() {
  return (
    <div className="grid min-h-[420px] place-items-center border-2 border-[#401421] bg-[#B8D9FF] p-6 text-center text-[#401421] shadow-[8px_8px_0_#FF574A] sm:p-12">
      <div className="max-w-xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em]">
          Fresh stories incoming
        </p>
        <h3 className="mt-4 text-4xl font-black leading-[0.94] tracking-[-0.04em] sm:text-5xl [font-family:var(--font-afterglow-display)]">
          The next local lineup is being edited now.
        </h3>
        <p className="mx-auto mt-5 max-w-md text-sm font-semibold leading-6 text-[#401421]/75">
          Browse every published place while recommendations for this reel are
          refreshed.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center gap-2 border-2 border-[#401421] bg-[#401421] px-5 text-sm font-extrabold text-[#FFF7ED] outline-none focus-visible:ring-4 focus-visible:ring-[#401421] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED]"
          href="/search"
        >
          Explore all places
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function formatLocation(listing: DiscoveryListing) {
  return (
    [listing.address.barangay, listing.address.municipality]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function formatPrice(price: number | null) {
  return price ? pesoFormatter.format(price / 100) : "Ask for rates";
}

function getCrowdCopy(listing: DiscoveryListing) {
  const level = listing.attributes.crowd_level;
  return level
    ? `${level.charAt(0).toUpperCase()}${level.slice(1)} crowd`
    : "Crowd update pending";
}

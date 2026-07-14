"use client";

import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Star,
} from "lucide-react";

import type { DiscoveryListing } from "@/modules/listings/search";

const CATEGORY_LABELS: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food & drink",
  activity: "Activity",
  service: "Local service",
};

const FALLBACK_IMAGES = [
  "/homepage-concepts/shared-photography/davao-aerial-desktop.webp",
  "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
  "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
  "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
] as const;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function KinabuhiIndexNavigator({
  listings,
}: {
  listings: DiscoveryListing[];
}) {
  const entries = listings.slice(0, 6);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (entries.length === 0) {
    return <IndexEmptyState />;
  }

  const activeIndex = Math.min(selectedIndex, entries.length - 1);
  const activeListing = entries[activeIndex];
  const activeMedia = activeListing.media[0];

  function selectIndex(index: number, moveFocus = false) {
    const nextIndex = (index + entries.length) % entries.length;
    const nextTab = tabRefs.current[nextIndex];

    setSelectedIndex(nextIndex);
    if (moveFocus) {
      nextTab?.focus();
    }
    nextTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
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
      selectIndex(entries.length - 1, true);
    }
  }

  return (
    <div className="overflow-hidden border border-[#17192B] bg-[#17192B] shadow-[8px_8px_0_#D3A632] sm:shadow-[12px_12px_0_#D3A632]">
      <div className="grid gap-px bg-[#17192B] lg:grid-cols-12">
        <Link
          aria-label={`Open ${activeListing.name}`}
          className="group relative min-h-[23rem] overflow-hidden bg-[#337565] outline-none focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-[#D3A632] focus-visible:ring-inset sm:min-h-[31rem] lg:col-span-7 lg:min-h-[39rem]"
          href={`/place/${activeListing.slug}`}
        >
          <Image
            alt={
              activeMedia?.caption ??
              `${activeListing.name}, ${formatLocation(activeListing)}`
            }
            className="object-cover transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            src={activeMedia?.url ?? fallbackImage(activeIndex)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17192B]/80 via-transparent to-[#17192B]/10" />
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-[#F3E9D8] sm:inset-x-7 sm:bottom-7">
            <p className="max-w-md text-xs font-bold uppercase tracking-[0.18em]">
              Photograph {String(activeIndex + 1).padStart(2, "0")} · Open the
              full entry
            </p>
            <ArrowUpRight
              aria-hidden="true"
              className="h-7 w-7 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </div>
        </Link>

        <article
          aria-labelledby={`kinabuhi-place-tab-${activeIndex}`}
          aria-live="polite"
          className="flex min-w-0 flex-col bg-[#F3E9D8] p-6 outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#E55A45] sm:p-9 lg:col-span-5 lg:p-11"
          id="kinabuhi-place-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <div className="flex items-start justify-between gap-5 border-b border-[#17192B]/25 pb-6">
            <p className="text-[4.5rem] font-semibold leading-[0.75] tracking-[-0.07em] text-[#17192B]/15 sm:text-[6rem] [font-family:var(--font-kinabuhi-editorial)]">
              {String(activeIndex + 1).padStart(2, "0")}
            </p>
            <span className="inline-flex min-h-11 items-center border border-[#17192B] bg-[#D3A632] px-3 text-[0.65rem] font-extrabold uppercase tracking-[0.16em]">
              {CATEGORY_LABELS[activeListing.category]}
            </span>
          </div>

          <div className="mt-8 lg:mt-auto">
            <p className="flex items-start gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#337565]">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {formatLocation(activeListing)}
            </p>
            <h3 className="mt-4 text-4xl font-semibold leading-[0.92] tracking-[-0.04em] sm:text-5xl [font-family:var(--font-kinabuhi-editorial)]">
              {activeListing.name}
            </h3>
            <p className="mt-5 line-clamp-4 text-sm leading-7 text-[#17192B]/72">
              {activeListing.description}
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-px border-y border-[#17192B]/25 py-5 text-sm">
              <div>
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#17192B]/55">
                  Guide price
                </dt>
                <dd className="mt-1.5 font-extrabold">
                  {formatPrice(activeListing.priceMin)}
                </dd>
              </div>
              <div className="border-l border-[#17192B]/20 pl-5">
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#17192B]/55">
                  Local signal
                </dt>
                <dd className="mt-1.5 inline-flex items-center gap-1.5 font-extrabold">
                  {activeListing.ratingCount > 0 ? (
                    <>
                      <Star
                        aria-hidden="true"
                        className="h-4 w-4 fill-[#E55A45] text-[#E55A45]"
                      />
                      {activeListing.ratingAvg.toFixed(1)}
                    </>
                  ) : (
                    "New entry"
                  )}
                </dd>
              </div>
            </dl>

            <Link
              className="mt-7 inline-flex min-h-12 w-full items-center justify-between gap-4 bg-[#17192B] px-5 text-sm font-extrabold text-[#F3E9D8] outline-none transition-colors hover:bg-[#337565] focus-visible:ring-4 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3E9D8] motion-reduce:transition-none"
              href={`/place/${activeListing.slug}`}
            >
              Read the place entry
              <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
        </article>
      </div>

      <div className="bg-[#17192B] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4 text-[#F3E9D8]">
          <div>
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#D3A632]">
              Browse the entries
            </p>
            <p className="mt-1 hidden text-xs text-[#F3E9D8]/55 sm:block">
              Swipe the rail or use arrow, Home, and End keys.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Show previous place"
              className="inline-flex h-11 w-11 items-center justify-center border border-[#F3E9D8]/35 outline-none transition-colors hover:bg-[#F3E9D8] hover:text-[#17192B] focus-visible:ring-2 focus-visible:ring-[#D3A632] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17192B] motion-reduce:transition-none"
              onClick={() => selectIndex(activeIndex - 1)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Show next place"
              className="inline-flex h-11 w-11 items-center justify-center border border-[#F3E9D8]/35 outline-none transition-colors hover:bg-[#F3E9D8] hover:text-[#17192B] focus-visible:ring-2 focus-visible:ring-[#D3A632] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17192B] motion-reduce:transition-none"
              onClick={() => selectIndex(activeIndex + 1)}
              type="button"
            >
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          aria-label="Choose a place from the local index"
          className="flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:#D3A632_#17192B] [scrollbar-width:thin]"
          role="tablist"
        >
          {entries.map((listing, index) => {
            const isSelected = index === activeIndex;

            return (
              <button
                aria-controls="kinabuhi-place-panel"
                aria-selected={isSelected}
                className="group grid min-h-[5.75rem] w-[78vw] max-w-[18rem] shrink-0 snap-start grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3 border border-[#F3E9D8]/30 bg-[#F3E9D8]/5 p-2 text-left text-[#F3E9D8] outline-none transition-[background-color,border-color,color] hover:border-[#F3E9D8] focus-visible:border-[#D3A632] focus-visible:ring-2 focus-visible:ring-[#D3A632] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17192B] data-[selected=true]:border-[#D3A632] data-[selected=true]:bg-[#F3E9D8] data-[selected=true]:text-[#17192B] motion-reduce:transition-none sm:w-[18rem]"
                data-selected={isSelected}
                id={`kinabuhi-place-tab-${index}`}
                key={listing.id}
                onClick={() => selectIndex(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                <span className="relative h-[4.25rem] w-[4.25rem] overflow-hidden bg-[#337565]">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="68px"
                    src={listing.media[0]?.url ?? fallbackImage(index)}
                  />
                </span>
                <span className="min-w-0 pr-2">
                  <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.14em] opacity-60">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {CATEGORY_LABELS[listing.category]}
                  </span>
                  <span className="mt-1.5 block truncate text-sm font-extrabold">
                    {listing.name}
                  </span>
                  <span className="mt-1 block truncate text-xs opacity-65">
                    {formatLocation(listing)}
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

function IndexEmptyState() {
  return (
    <div className="grid min-h-[28rem] place-items-center border border-[#17192B] bg-[#D3A632] p-6 text-center shadow-[8px_8px_0_#17192B] sm:p-12">
      <div className="max-w-lg">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em]">
          The next entries are being edited
        </p>
        <h3 className="mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.04em] sm:text-5xl [font-family:var(--font-kinabuhi-editorial)]">
          The local index will keep growing.
        </h3>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#17192B]/70">
          Browse every published place while this edition is being assembled.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center gap-3 bg-[#17192B] px-5 text-sm font-extrabold text-[#F3E9D8] outline-none focus-visible:ring-4 focus-visible:ring-[#E55A45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#D3A632]"
          href="/search"
        >
          Open all places
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function fallbackImage(index: number) {
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function formatLocation(listing: DiscoveryListing) {
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

function formatPrice(price: number | null) {
  return price === null ? "Ask for rates" : pesoFormatter.format(price / 100);
}

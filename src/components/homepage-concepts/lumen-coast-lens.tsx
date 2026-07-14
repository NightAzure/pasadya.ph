"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";

import type { DiscoveryListing } from "@/modules/listings/search";

type LensArea = "davao-city" | "samal";

type LensPhoto = {
  src: string;
  alt: string;
  note: string;
  position?: string;
};

const areaContent: Record<
  LensArea,
  {
    label: string;
    kicker: string;
    description: string;
    photos: [LensPhoto, LensPhoto, LensPhoto];
  }
> = {
  "davao-city": {
    label: "Davao City",
    kicker: "City rhythm",
    description:
      "Food stops, useful stays, and easy jump-off points for a well-paced day.",
    photos: [
      {
        src: "/homepage-concepts/shared-photography/davao-aerial-desktop.webp",
        alt: "Aerial view across Davao City toward the gulf and mountain ridge",
        note: "City, gulf, and highland horizon",
        position: "center 48%",
      },
      {
        src: "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
        alt: "Durian fruit at a market in Davao City",
        note: "A market signature",
        position: "center 55%",
      },
      {
        src: "/homepage-concepts/shared-photography/davao-sunset-desktop.webp",
        alt: "Sunset light over the Davao coast",
        note: "The city at golden hour",
        position: "center 52%",
      },
    ],
  },
  samal: {
    label: "Samal Island",
    kicker: "Island tempo",
    description:
      "Beach days, relaxed resorts, and crossings worth planning before you go.",
    photos: [
      {
        src: "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
        alt: "Palm-lined shore on Samal Island",
        note: "Room to slow down",
        position: "center 48%",
      },
      {
        src: "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
        alt: "Coastal dock on Samal Island",
        note: "Arrive by the water",
        position: "center 52%",
      },
      {
        src: "/homepage-concepts/shared-photography/samal-shore-mobile.webp",
        alt: "A closer view of the shoreline on Samal Island",
        note: "A closer island view",
        position: "center 56%",
      },
    ],
  },
};

const categoryLabels: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food & drink",
  activity: "Activity",
  service: "Local service",
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function LumenCoastLens({ listings }: { listings: DiscoveryListing[] }) {
  const [area, setArea] = useState<LensArea>("davao-city");
  const content = areaContent[area];
  const recommendations = useMemo(() => {
    return listings
      .filter((listing) => listingBelongsTo(listing, area))
      .slice(0, 4);
  }, [area, listings]);

  return (
    <section
      aria-labelledby="lumen-area-title"
      className="lc-lens-section px-5 pb-20 pt-10 sm:px-8 sm:pb-28 lg:px-12"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-7 border-t border-[#2A1934]/20 pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="lc-kicker">Two places, one easy lens</p>
            <h2
              className="mt-3 max-w-2xl text-[clamp(2.15rem,4vw,4.25rem)] font-semibold leading-[0.97] tracking-[-0.045em]"
              id="lumen-area-title"
            >
              Look closer at the day you want.
            </h2>
          </div>

          <div
            aria-label="Choose an area to preview"
            className="lc-area-switch"
            role="group"
          >
            {(Object.keys(areaContent) as LensArea[]).map((option) => (
              <button
                aria-pressed={area === option}
                className="lc-area-button"
                key={option}
                onClick={() => setArea(option)}
                type="button"
              >
                <span aria-hidden="true" className="lc-area-dot" />
                {areaContent[option].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#315CFF]">
              {content.kicker} · Showing {content.label}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#2A1934]/65 sm:text-base">
              {content.description}
            </p>
          </div>
          <Link
            className="lc-text-link"
            href={`/search?area=${encodeURIComponent(area)}`}
          >
            Explore all in {content.label}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="lc-photo-ribbon mt-8">
          {content.photos.map((photo, index) => (
            <figure
              className={`lc-lens-photo lc-lens-photo-${index + 1}`}
              key={`${area}-${photo.src}`}
            >
              <Image
                alt={photo.alt}
                className="object-cover"
                fill
                priority={index === 0}
                sizes={
                  index === 0
                    ? "(min-width: 1024px) 55vw, 100vw"
                    : "(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 100vw"
                }
                src={photo.src}
                style={{ objectPosition: photo.position }}
              />
              <figcaption>{photo.note}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="lc-kicker">The local index</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                A short list for {content.label}
              </h3>
            </div>
            <span className="text-lg italic text-[#2A1934]/60 [font-family:var(--font-lumen-serif)]">
              Chosen from current Pasadya listings
            </span>
          </div>

          {recommendations.length > 0 ? (
            <ol className="lc-local-index mt-7">
              {recommendations.map((listing, index) => {
                const place =
                  listing.address.barangay ??
                  listing.address.municipality ??
                  content.label;
                const crowd = crowdLabel(listing.attributes.crowd_level);

                return (
                  <li key={listing.id}>
                    <Link
                      className="lc-index-row group"
                      href={`/place/${listing.slug}`}
                    >
                      <span className="lc-index-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#315CFF]">
                          {categoryLabels[listing.category]}
                          <span className="inline-flex items-center gap-1 text-[#2A1934]/70">
                            <MapPin aria-hidden="true" className="h-3 w-3" />
                            {place}
                          </span>
                          {crowd ? (
                            <span className="text-[#A73524]">{crowd}</span>
                          ) : null}
                        </span>
                        <span className="mt-2 block truncate text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                          {listing.name}
                        </span>
                      </span>
                      <span className="lc-index-price">
                        {formatPrice(listing.priceMin)}
                      </span>
                      <span className="lc-index-arrow">
                        <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-7 border-y border-[#2A1934]/20 py-12 text-center">
              <p className="text-2xl italic [font-family:var(--font-lumen-serif)]">
                This part of the local index is being refreshed.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#2A1934]/65">
                Browse the complete search while new recommendations for this
                area are prepared.
              </p>
              <Link
                className="lc-primary-button mt-6"
                href={`/search?area=${encodeURIComponent(area)}`}
              >
                Browse {content.label}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function listingBelongsTo(listing: DiscoveryListing, area: LensArea) {
  const municipality = listing.address.municipality?.toLowerCase() ?? "";
  return area === "samal"
    ? municipality.includes("samal")
    : municipality.includes("davao");
}

function crowdLabel(value: unknown) {
  if (value === "quiet") return "Quiet";
  if (value === "moderate") return "Moderate";
  if (value === "busy") return "Busy";
  if (value === "full") return "Full";
  return null;
}

function formatPrice(price: number | null) {
  return price ? `From ${pesoFormatter.format(price / 100)}` : "Ask for rates";
}

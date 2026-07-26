"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Heart,
  Info,
  MapPin,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";

import { trackHomepageEvent } from "@/components/homepage-concepts/pasadya-daylight-analytics";
import styles from "@/components/homepage-concepts/pasadya-daylight.module.css";
import type {
  DiscoveryListing,
  ListingCategory,
} from "@/modules/listings/search";

type StoredPreviewState = {
  version: 2;
  savedListingIds: string[];
  savedGuideIds: string[];
};

type HomepageCardPresentation = {
  bookingLabel: string;
  crowdLabel: string | null;
  priceLabel: string;
  trustLabel: string | null;
};

const STORAGE_KEY = "pasadya:homepage-concept:daylight:v2";
const LEGACY_STORAGE_KEY = "pasadya:homepage-concept:daylight:v1";

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  resort: "Resort",
  room: "Room & Stay",
  restaurant: "Food & Drink",
  activity: "Thing to Do",
  service: "Local Service",
};

const PRICE_UNIT_LABELS: Record<string, string> = {
  per_night: "per night",
  per_person: "per person",
  per_group: "per group",
  flat: "",
};

export function PasadyaDaylightSavedSection({
  listings,
}: {
  listings: DiscoveryListing[];
}) {
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;

      const validListingIds = new Set(listings.map((listing) => listing.id));
      const stored = readStoredState();
      setSavedListingIds(
        stored.savedListingIds.filter((id) => validListingIds.has(id)),
      );
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [listings]);

  useEffect(() => {
    if (!hydrated) return;
    const nextState: StoredPreviewState = {
      version: 2,
      savedListingIds,
      savedGuideIds: [],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [hydrated, savedListingIds]);

  function toggleListing(listing: DiscoveryListing) {
    const isSaved = savedListingIds.includes(listing.id);
    setSavedListingIds((current) =>
      isSaved
        ? current.filter((id) => id !== listing.id)
        : [...current, listing.id],
    );
    setAnnouncement(
      isSaved
        ? `${listing.name} removed from saved places.`
        : `${listing.name} saved on this device.`,
    );
  }

  return (
    <>
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <section
        aria-labelledby="places-title"
        className={`${styles.section} ${styles.placesSection}`}
        id="places"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Recommended places</p>
              <h2 id="places-title">Places to Start With</h2>
            </div>
            <div className={styles.headingAction}>
              <p>
                Compare a short list with useful price, booking, review, and
                crowd context.
              </p>
              <Link href="/search">
                Browse All Places
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          {listings.length > 0 ? (
            <div className={styles.listingGrid}>
              {listings.map((listing) => (
                <ListingCard
                  isSaved={savedListingIds.includes(listing.id)}
                  key={listing.id}
                  listing={listing}
                  onToggleSave={() => toggleListing(listing)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Info aria-hidden="true" />
              <p>Recommended places are being refreshed.</p>
              <Link href="/search">Search All Places</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ListingCard({
  isSaved,
  listing,
  onToggleSave,
}: {
  isSaved: boolean;
  listing: DiscoveryListing;
  onToggleSave: () => void;
}) {
  const image = listing.media[0];
  const presentation = cardPresentation(listing);
  const placeHref = `/place/${listing.slug}`;

  function trackListingOpen(source: string) {
    trackHomepageEvent("homepage_listing_open", {
      listingId: listing.id,
      listingSlug: listing.slug,
      source,
    });
  }

  return (
    <article className={styles.listingCard}>
      <div className={styles.listingImage}>
        {image ? (
          <Image
            alt={image.caption ?? `View of ${listing.name}`}
            fill
            loading="lazy"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            src={image.url}
          />
        ) : (
          <div className={styles.imageFallback}>
            <MapPin aria-hidden="true" />
            <span>Photo being confirmed</span>
          </div>
        )}
        <button
          aria-label={
            isSaved ? `Unsave ${listing.name}` : `Save ${listing.name}`
          }
          aria-pressed={isSaved}
          className={styles.saveButton}
          data-saved={isSaved ? "true" : undefined}
          onClick={onToggleSave}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={isSaved ? styles.savedIcon : ""}
          />
        </button>
      </div>
      <div className={styles.listingBody}>
        <div className={styles.listingMeta}>
          <span>{CATEGORY_LABELS[listing.category]}</span>
          <span>{listingLocation(listing)}</span>
        </div>
        <div className={styles.listingTitleRow}>
          <h3>
            <Link href={placeHref} onClick={() => trackListingOpen("title")}>
              {listing.name}
            </Link>
          </h3>
          {listing.ratingCount > 0 ? (
            <span className={styles.rating}>
              <Star aria-hidden="true" />
              {listing.ratingAvg.toFixed(1)}
            </span>
          ) : null}
        </div>
        {listing.ratingCount > 0 ? (
          <p className={styles.reviewCount}>
            {listing.ratingCount.toLocaleString("en-PH")} community review
            {listing.ratingCount === 1 ? "" : "s"}
          </p>
        ) : (
          <p className={styles.reviewCount}>No community reviews yet</p>
        )}
        <div className={styles.statusRow}>
          <span className={styles.bookingStatus}>
            <CalendarCheck aria-hidden="true" />
            {presentation.bookingLabel}
          </span>
          {presentation.trustLabel ? (
            <span className={styles.trustStatus}>
              <BadgeCheck aria-hidden="true" />
              {presentation.trustLabel}
            </span>
          ) : null}
        </div>
        {presentation.crowdLabel ? (
          <p className={styles.crowdContext}>{presentation.crowdLabel}</p>
        ) : null}
        <div className={styles.listingFooter}>
          <div>
            <span>Starting Rate</span>
            <strong>{presentation.priceLabel}</strong>
          </div>
          <Link
            className={styles.cardAction}
            href={placeHref}
            onClick={() => trackListingOpen("card_cta")}
          >
            View Place
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function cardPresentation(listing: DiscoveryListing): HomepageCardPresentation {
  const lowestRate = listing.ratePlans.reduce<
    DiscoveryListing["ratePlans"][number] | null
  >(
    (lowest, rate) => (!lowest || rate.price < lowest.price ? rate : lowest),
    null,
  );

  let priceLabel = "Ask for Rates";
  if (lowestRate) {
    const unit = PRICE_UNIT_LABELS[lowestRate.priceUnit] ?? "";
    priceLabel = `From ${formatPrice(lowestRate.price)}${unit ? ` ${unit}` : ""}`;
  } else if (listing.priceMin !== null) {
    priceLabel = `From ${formatPrice(listing.priceMin)}`;
  }

  const bookingLabel =
    listing.bookingMode === "instant"
      ? "Instant Booking"
      : listing.bookingMode === "inquiry"
        ? "Request Required"
        : "Details Only";

  const trustLabel =
    listing.claimStatus === "claimed"
      ? "Verified Owner"
      : listing.dotAccredited
        ? "DOT Accredited"
        : null;

  return {
    bookingLabel,
    crowdLabel: crowdPresentation(listing),
    priceLabel,
    trustLabel,
  };
}

function crowdPresentation(listing: DiscoveryListing) {
  const level = listing.attributes.crowd_level;
  const source = String(listing.attributes.crowd_source ?? "").toLowerCase();
  if (!level && !source) return null;

  const label =
    level === "quiet"
      ? "quiet"
      : level === "busy"
        ? "busy"
        : level === "full"
          ? "often full"
          : "moderate";

  if (/business|owner/.test(source)) {
    return `Owner-reported crowd: ${label}`;
  }
  if (/community/.test(source)) {
    return `Community-reported crowd: ${label}`;
  }
  if (/after 6|evening/.test(source)) return "Usually busiest after 6 PM";
  if (/sunday/.test(source)) return "Usually busiest on Sundays";
  if (/weekend/.test(source)) return `Typical crowd: ${label} on weekends`;
  if (/weekday/.test(source)) return `Typical crowd: ${label} on weekdays`;
  if (/weather/.test(source)) return "Crowd levels vary with the weather";
  return `Typical crowd: ${label}`;
}

function readStoredState(): StoredPreviewState {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<StoredPreviewState>;
      return {
        version: 2,
        savedListingIds: Array.isArray(parsed.savedListingIds)
          ? parsed.savedListingIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
        savedGuideIds: [],
      };
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  return { version: 2, savedListingIds: [], savedGuideIds: [] };
}

function listingLocation(listing: DiscoveryListing) {
  return (
    listing.address.barangay ??
    listing.address.municipality ??
    listing.address.province ??
    "Davao region"
  );
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatPrice(price: number) {
  return pesoFormatter.format(price / 100);
}

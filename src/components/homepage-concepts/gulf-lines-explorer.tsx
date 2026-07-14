"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, MapPin, Navigation, Star, Waves } from "lucide-react";

import type { DiscoveryListing } from "@/modules/listings/search";
import { ResponsiveHeroArt } from "@/components/homepage-concepts/responsive-hero";
import type { GeoPoint, TransportRoute } from "@/modules/transport/service";

const CATEGORY_LABELS: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food",
  activity: "Activity",
  service: "Service",
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type PositionedListing = DiscoveryListing & {
  point: { x: number; y: number } | null;
};

export type GulfMapRoute = Pick<
  TransportRoute,
  "id" | "name" | "mode" | "geometry" | "stops"
>;

export type GulfMapFerry = {
  id: string;
  originPoint: GeoPoint;
  destinationPoint: GeoPoint;
};

export function GulfLinesExplorer({
  children,
  listings,
  routes,
  ferries,
}: {
  children: ReactNode;
  listings: DiscoveryListing[];
  routes: GulfMapRoute[];
  ferries: GulfMapFerry[];
}) {
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  const map = useMemo(() => {
    const routeLines = routes
      .map((route) => ({
        route,
        points: route.geometry.length > 1 ? route.geometry : route.stops,
      }))
      .filter(({ points }) => points.length > 1);
    const ferryLines = ferries.map((ferry) => ({
      ferry,
      points: [ferry.originPoint, ferry.destinationPoint],
    }));
    const listingPoints = listings.flatMap((listing) =>
      isCoordinate(listing)
        ? [{ lat: listing.lat as number, lng: listing.lng as number }]
        : [],
    );
    const bounds = getBounds([
      ...routeLines.flatMap(({ points }) => points),
      ...ferryLines.flatMap(({ points }) => points),
      ...listingPoints,
    ]);

    return {
      routeLines: routeLines.map(({ route, points }) => ({
        route,
        points: points.map((point) => positionPoint(point, bounds)),
      })),
      ferryLines: ferryLines.map(({ ferry, points }) => ({
        ferry,
        points: points.map((point) => positionPoint(point, bounds)),
      })),
      listings: listings.map<PositionedListing>((listing) => ({
        ...listing,
        point: isCoordinate(listing)
          ? positionPoint(
              { lat: listing.lat as number, lng: listing.lng as number },
              bounds,
            )
          : null,
      })),
    };
  }, [ferries, listings, routes]);

  return (
    <>
      <section
        aria-labelledby="gulf-hero-title"
        className="relative overflow-hidden border-b border-[#42DECA]/20 bg-[#052D35]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(66,222,202,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(66,222,202,.07)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto grid max-w-[1440px] lg:min-h-[720px] lg:grid-cols-[minmax(0,0.82fr)_minmax(560px,1.18fr)]">
          <div className="relative z-10 flex min-w-0 items-center px-5 py-14 sm:px-8 sm:py-20 lg:px-12 xl:px-20">
            {children}
          </div>

          <div
            aria-label="Interactive map of featured places and published transport corridors"
            className="relative min-h-[500px] overflow-hidden border-t border-[#42DECA]/20 bg-[#031f25] lg:min-h-full lg:border-l lg:border-t-0"
            role="group"
          >
            <ResponsiveHeroArt
              className="opacity-40 mix-blend-luminosity"
              desktopMedia="(min-width: 640px)"
              desktopSizes="(min-width: 1024px) 58vw, 100vw"
              desktopSrc="/homepage-concepts/gulf-lines/hero-desktop.webp"
              mobileSrc="/homepage-concepts/gulf-lines/hero-mobile.webp"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_48%,rgba(66,222,202,0.08),rgba(5,45,53,0.45)_50%,rgba(3,31,37,0.9)_100%)]" />

            <div className="absolute left-5 top-5 z-20 max-w-[calc(100%-2.5rem)] rounded-full border border-[#42DECA]/30 bg-[#052D35]/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F2E9D5] backdrop-blur-md sm:left-8 sm:top-8">
              Live guide canvas · Davao City + Samal Island
            </div>

            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <g
                fill="none"
                stroke="#42DECA"
                strokeOpacity="0.12"
                strokeWidth="0.22"
                vectorEffect="non-scaling-stroke"
              >
                <path d="M-4 26 C16 14, 31 36, 52 22 S83 13, 108 31" />
                <path d="M-8 43 C12 31, 29 52, 49 39 S83 28, 106 48" />
                <path d="M-5 69 C22 54, 33 77, 57 63 S87 53, 106 74" />
                <path d="M17 -4 C8 21, 26 33, 16 58 S22 84, 15 105" />
                <path d="M72 -3 C61 18, 78 38, 67 57 S76 85, 70 105" />
              </g>

              {map.routeLines.map(({ route, points }, index) => (
                <polyline
                  className="gulf-route-line"
                  data-route-index={index}
                  fill="none"
                  key={route.id}
                  points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
                  stroke="#3578FF"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={route.mode === "ferry" ? "0.65" : "0.9"}
                  strokeWidth={route.mode === "ferry" ? "0.55" : "0.72"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {map.ferryLines.map(({ ferry, points }, index) => (
                <polyline
                  className="gulf-ferry-line"
                  data-ferry-index={index}
                  fill="none"
                  key={ferry.id}
                  points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
                  stroke="#42DECA"
                  strokeDasharray="1.1 1.1"
                  strokeLinecap="round"
                  strokeOpacity="0.95"
                  strokeWidth="0.62"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {map.listings.map((listing, index) =>
              listing.point ? (
                <Link
                  aria-label={`Open ${listing.name}`}
                  className="group/pin absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#F2E9D5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#052D35]"
                  data-active={activeListingId === listing.id}
                  href={`/place/${listing.slug}`}
                  key={listing.id}
                  onBlur={() => setActiveListingId(null)}
                  onFocus={() => setActiveListingId(listing.id)}
                  onMouseEnter={() => setActiveListingId(listing.id)}
                  onMouseLeave={() => setActiveListingId(null)}
                  style={{
                    left: `${listing.point.x}%`,
                    top: `${listing.point.y}%`,
                  }}
                >
                  <span className="gulf-pin-pulse absolute h-9 w-9 rounded-full bg-[#42DECA]/20 group-data-[active=true]/pin:bg-[#FF7858]/25" />
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F2E9D5] bg-[#42DECA] text-[11px] font-bold text-[#052D35] shadow-[0_8px_24px_rgba(0,0,0,.35)] transition duration-200 group-hover/pin:scale-125 group-data-[active=true]/pin:scale-125 group-data-[active=true]/pin:bg-[#FF7858]">
                    {index + 1}
                  </span>
                </Link>
              ) : null,
            )}

            <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F2E9D5]/15 bg-[#052D35]/90 p-4 text-[#F2E9D5] backdrop-blur-md sm:bottom-8 sm:left-8 sm:right-8">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                <span className="inline-flex items-center gap-2">
                  <span className="h-0.5 w-7 bg-[#3578FF]" />
                  {routes.length} published{" "}
                  {routes.length === 1 ? "route" : "routes"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-0.5 w-7 border-t border-dashed border-[#42DECA]" />
                  {ferries.length} ferry{" "}
                  {ferries.length === 1 ? "crossing" : "crossings"}
                </span>
              </div>
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F2E9D5] px-4 text-xs font-bold text-[#052D35] outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#42DECA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#052D35]"
                href="/transport"
              >
                Plan a route
                <Navigation aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="gulf-recommendations-title"
        className="bg-[#F2E9D5] px-5 py-16 text-[#052D35] sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#052D35]/65">
                Six signals worth following
              </p>
              <h2
                className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl"
                id="gulf-recommendations-title"
              >
                Map-connected recommendations
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#052D35]/70">
              Move between the guide canvas and each place card. Every stop is
              priced clearly, with the route tools close at hand.
            </p>
          </div>

          {map.listings.length > 0 ? (
            <div className="mt-10 grid gap-px overflow-hidden rounded-[28px] border border-[#052D35]/20 bg-[#052D35]/20 md:grid-cols-2 xl:grid-cols-3">
              {map.listings.map((listing, index) => (
                <article
                  className="group relative min-w-0 bg-[#F8F1E1] transition-colors duration-200 hover:bg-white data-[active=true]:bg-white"
                  data-active={activeListingId === listing.id}
                  key={listing.id}
                  onMouseEnter={() => setActiveListingId(listing.id)}
                  onMouseLeave={() => setActiveListingId(null)}
                >
                  <Link
                    className="block h-full outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#42DECA]"
                    href={`/place/${listing.slug}`}
                    onBlur={() => setActiveListingId(null)}
                    onFocus={() => setActiveListingId(listing.id)}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#0a3a42]">
                      {listing.media[0] ? (
                        <Image
                          alt={
                            listing.media[0].caption ??
                            `${listing.name} listing photo`
                          }
                          className="object-cover transition duration-500 group-hover:scale-[1.035]"
                          fill
                          loading="lazy"
                          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                          src={listing.media[0].url}
                        />
                      ) : (
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-0 [background-image:linear-gradient(135deg,transparent_35%,rgba(66,222,202,.22)_35%,rgba(66,222,202,.22)_37%,transparent_37%),radial-gradient(circle_at_70%_30%,rgba(255,120,88,.35),transparent_28%)]" />
                          <Waves
                            aria-hidden="true"
                            className="absolute bottom-8 right-8 h-14 w-14 text-[#42DECA]"
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#052D35]/75 via-transparent to-transparent" />
                      <span className="absolute left-5 top-5 flex h-10 min-w-10 items-center justify-center rounded-full border border-white/50 bg-[#052D35]/80 px-3 text-sm font-bold text-white backdrop-blur">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="absolute bottom-5 left-5 rounded-full bg-[#F2E9D5] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#052D35]">
                        {CATEGORY_LABELS[listing.category]}
                      </span>
                    </div>

                    <div className="p-6 sm:p-7">
                      <div className="flex items-start justify-between gap-5">
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold leading-tight tracking-[-0.025em]">
                            {listing.name}
                          </h3>
                          <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-[#052D35]/65">
                            <MapPin
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0"
                            />
                            {formatAddress(listing)}
                          </p>
                        </div>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-6 w-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                        />
                      </div>

                      <div className="mt-7 flex items-end justify-between gap-4 border-t border-[#052D35]/15 pt-5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#052D35]/55">
                            Starts at
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatConceptPrice(listing.priceMin)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                          <Star
                            aria-hidden="true"
                            className="h-4 w-4 fill-[#FF7858] text-[#FF7858]"
                          />
                          {listing.ratingCount > 0
                            ? listing.ratingAvg.toFixed(1)
                            : "New"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-[28px] border border-[#052D35]/20 bg-[#F8F1E1] p-8 sm:p-12">
              <p className="text-2xl font-semibold">
                Fresh places are being mapped.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#052D35]/70">
                Start with a category now, or return when the next set of local
                recommendations is published.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  ["Resorts", "/search?category=resort"],
                  ["Food", "/search?category=restaurant"],
                  ["Activities", "/search?category=activity"],
                ].map(([label, href]) => (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-full bg-[#052D35] px-5 text-sm font-semibold text-[#F2E9D5] outline-none focus-visible:ring-2 focus-visible:ring-[#42DECA] focus-visible:ring-offset-2"
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes gulf-pulse {
          0% {
            opacity: 0.75;
            transform: scale(0.72);
          }
          72%,
          100% {
            opacity: 0;
            transform: scale(1.55);
          }
        }

        .gulf-route-line {
          stroke-dasharray: 110;
          stroke-dashoffset: 110;
          animation: gulf-draw 1.4s ease-out forwards;
        }

        .gulf-pin-pulse {
          animation: gulf-pulse 3s ease-out infinite;
        }

        .gulf-ferry-line {
          animation: gulf-ferry 18s linear infinite;
        }

        @keyframes gulf-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes gulf-ferry {
          to {
            stroke-dashoffset: -12;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gulf-route-line,
          .gulf-ferry-line,
          .gulf-pin-pulse {
            animation: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  );
}

function isCoordinate(
  listing: DiscoveryListing,
): listing is DiscoveryListing & { lat: number; lng: number } {
  return (
    typeof listing.lat === "number" &&
    Number.isFinite(listing.lat) &&
    typeof listing.lng === "number" &&
    Number.isFinite(listing.lng)
  );
}

function getBounds(points: GeoPoint[]): Bounds {
  if (points.length === 0) {
    return {
      minLat: 7.02,
      maxLat: 7.2,
      minLng: 125.56,
      maxLng: 125.78,
    };
  }

  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const latPadding = Math.max((maxLat - minLat) * 0.13, 0.012);
  const lngPadding = Math.max((maxLng - minLng) * 0.13, 0.012);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
  };
}

function positionPoint(point: GeoPoint, bounds: Bounds) {
  const x =
    5 +
    ((point.lng - bounds.minLng) /
      Math.max(bounds.maxLng - bounds.minLng, 0.001)) *
      90;
  const y =
    95 -
    ((point.lat - bounds.minLat) /
      Math.max(bounds.maxLat - bounds.minLat, 0.001)) *
      90;

  return {
    x: Math.min(95, Math.max(5, x)),
    y: Math.min(95, Math.max(5, y)),
  };
}

function formatAddress(listing: DiscoveryListing) {
  return (
    [listing.address.barangay, listing.address.municipality]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function formatConceptPrice(price: number | null) {
  return price ? pesoFormatter.format(price / 100) : "Ask for Rates";
}

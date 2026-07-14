import { MapPin } from "lucide-react";

import {
  categoryLabels,
  formatAddress,
  type DiscoveryListing,
} from "@/modules/listings/discovery";

export function MapPanel({ listings }: { listings: DiscoveryListing[] }) {
  const pinnedListings = listings.filter(
    (listing) => listing.lat !== null && listing.lng !== null,
  );
  const bounds = getBounds(pinnedListings);

  return (
    <section
      aria-label="Map preview"
      className="relative min-h-[420px] overflow-hidden rounded-md border bg-[#e7f2ef] shadow-sm"
    >
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-0 top-1/3 h-px w-full bg-white/80" />
        <div className="absolute left-0 top-2/3 h-px w-full bg-white/80" />
        <div className="absolute left-1/3 top-0 h-full w-px bg-white/80" />
        <div className="absolute left-2/3 top-0 h-full w-px bg-white/80" />
        <div className="absolute bottom-0 right-0 h-32 w-40 rounded-tl-full bg-primary/20" />
        <div className="absolute left-0 top-0 h-28 w-48 rounded-br-full bg-success/15" />
      </div>

      <div className="absolute left-4 top-4 rounded-md border bg-card/95 p-3 shadow-sm">
        <p className="text-sm font-semibold">Seeded map view</p>
        <p className="mt-1 max-w-52 text-xs leading-5 text-muted-foreground">
          Pins are positioned from listing coordinates. Live OSM tiles are
          pending the Phase 03 map provider decision.
        </p>
      </div>

      {pinnedListings.length === 0 ? (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md border bg-card/95 p-4 text-center shadow-sm">
          <p className="text-sm font-semibold">No mappable listings</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing filters or choosing a different area.
          </p>
        </div>
      ) : null}

      {pinnedListings.map((listing) => {
        const position = pinPosition(listing, bounds);

        return (
          <a
            aria-label={`${listing.name}, ${formatAddress(listing.address)}`}
            className="absolute z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={`/place/${listing.slug}`}
            key={listing.id}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            title={`${listing.name} - ${categoryLabels[listing.category]}`}
          >
            <MapPin aria-hidden="true" className="h-5 w-5 fill-primary" />
          </a>
        );
      })}

      <div className="absolute bottom-4 left-4 right-4 rounded-md border bg-card/95 p-3 shadow-sm">
        <p className="text-sm font-semibold">
          {pinnedListings.length} visible pins
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pin count matches the listings currently shown.
        </p>
      </div>
    </section>
  );
}

function getBounds(listings: DiscoveryListing[]) {
  const lats = listings
    .map((listing) => listing.lat)
    .filter((value): value is number => value !== null);
  const lngs = listings
    .map((listing) => listing.lng)
    .filter((value): value is number => value !== null);

  if (lats.length === 0 || lngs.length === 0) {
    return {
      minLat: 0,
      maxLat: 1,
      minLng: 0,
      maxLng: 1,
    };
  }

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function pinPosition(
  listing: DiscoveryListing,
  bounds: ReturnType<typeof getBounds>,
) {
  if (listing.lat === null || listing.lng === null) {
    return { x: 50, y: 50 };
  }

  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.01);
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  const x = 16 + ((listing.lng - bounds.minLng) / lngRange) * 68;
  const y = 16 + ((bounds.maxLat - listing.lat) / latRange) * 68;

  return { x, y };
}

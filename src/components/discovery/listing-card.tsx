import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  PhilippinePeso,
  Star,
  Umbrella,
  Waves,
  Wifi,
} from "lucide-react";

import { CrowdBadge, StatusBadges } from "@/components/discovery/status-badge";
import {
  categoryLabels,
  formatAddress,
  formatPrice,
  type DiscoveryListing,
} from "@/modules/listings/discovery";

const amenityIcons = {
  pool: Waves,
  "beach-access": Umbrella,
  wifi: Wifi,
} as const;

export function ListingCard({
  listing,
  priority = false,
}: {
  listing: DiscoveryListing;
  priority?: boolean;
}) {
  const image = listing.media[0];

  return (
    <article className="overflow-hidden rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href={`/place/${listing.slug}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {image ? (
            <Image
              alt={image.caption ?? `${listing.name} listing photo`}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              fetchPriority={priority ? "high" : "auto"}
              fill
              loading={priority ? "eager" : "lazy"}
              sizes="(min-width: 1024px) 360px, 100vw"
              src={image.url}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Photo pending
            </div>
          )}
          <div className="absolute left-3 top-3">
            <CrowdBadge listing={listing} />
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold leading-6 text-foreground">
                {listing.name}
              </h3>
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium">
                <Star
                  aria-hidden="true"
                  className="h-4 w-4 fill-accent text-accent"
                />
                {listing.ratingAvg.toFixed(1)}
              </span>
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{formatAddress(listing.address)}</span>
            </p>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {listing.description}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-7 items-center gap-1 rounded-sm bg-secondary px-2 text-xs font-medium text-secondary-foreground">
              {categoryLabels[listing.category]}
            </span>
            {listing.amenities.slice(0, 3).map((amenity) => {
              const Icon =
                amenityIcons[amenity.slug as keyof typeof amenityIcons] ??
                PhilippinePeso;

              return (
                <span
                  className="inline-flex min-h-7 items-center gap-1 rounded-sm bg-secondary px-2 text-xs font-medium text-secondary-foreground"
                  key={amenity.slug}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {amenity.name}
                </span>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm">
              <span className="font-semibold">
                From {formatPrice(listing.priceMin)}
              </span>
            </p>
            <span className="text-sm font-medium text-primary">View place</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ListingCardCompact({ listing }: { listing: DiscoveryListing }) {
  return (
    <Link
      className="grid min-h-24 grid-cols-[96px_1fr] gap-3 rounded-md border bg-card p-2 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={`/place/${listing.slug}`}
    >
      <div className="relative overflow-hidden rounded-sm bg-muted">
        {listing.media[0] ? (
          <Image
            alt={listing.media[0].caption ?? `${listing.name} listing photo`}
            className="object-cover"
            fill
            sizes="96px"
            src={listing.media[0].url}
          />
        ) : null}
      </div>
      <div className="min-w-0 py-1">
        <h3 className="truncate text-sm font-semibold">{listing.name}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {formatAddress(listing.address)}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium">
            <Star aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            {listing.ratingAvg.toFixed(1)}
          </span>
          <span className="text-muted-foreground">
            {formatPrice(listing.priceMin)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export { StatusBadges };

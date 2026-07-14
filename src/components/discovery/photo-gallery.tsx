import Image from "next/image";

import type { DiscoveryListing } from "@/modules/listings/discovery";

export function PhotoGallery({ listing }: { listing: DiscoveryListing }) {
  const photos = listing.media.slice(0, 5);
  const fallback = photos[0];

  return (
    <section aria-label={`${listing.name} photos`} className="grid gap-2">
      <div className="grid gap-2 overflow-hidden rounded-md lg:grid-cols-2">
        <div className="relative aspect-[16/10] bg-muted lg:aspect-[4/3]">
          {fallback ? (
            <Image
              alt={fallback.caption ?? `${listing.name} main photo`}
              className="object-cover"
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(min-width: 1024px) 50vw, 100vw"
              src={fallback.url}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Photo pending
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(photos.length > 1 ? photos.slice(1) : photos).map(
            (photo, index) => (
              <div
                className="relative aspect-[16/10] overflow-hidden bg-muted lg:aspect-[4/3]"
                key={`${photo.url}-${index}`}
              >
                <Image
                  alt={photo.caption ?? `${listing.name} gallery photo`}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  src={photo.url}
                />
                {index === 3 ? (
                  <div className="absolute inset-0 flex items-end justify-end bg-foreground/35 p-3 text-sm font-semibold text-background">
                    Show all photos
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Seed photos are generated placeholders until owned or licensed business
        photos are available.
      </p>
    </section>
  );
}

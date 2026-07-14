import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, PhilippinePeso, Star } from "lucide-react";

import {
  ListingCardCompact,
  StatusBadges,
} from "@/components/discovery/listing-card";
import { CommunityPanel } from "@/components/community/community-panel";
import { MapPanel } from "@/components/discovery/map-panel";
import { PhotoGallery } from "@/components/discovery/photo-gallery";
import { CrowdBadge } from "@/components/discovery/status-badge";
import { Button } from "@/components/ui/button";
import { TransportPlanner } from "@/components/transport/transport-planner";
import { listingSlugSchema } from "@/lib/validation";
import {
  defaultOrigins,
  getTransportDestinations,
  planJourney,
} from "@/modules/transport/service";
import {
  categoryLabels,
  crowdLabel,
  formatAddress,
  formatPrice,
  getListingBySlug,
  getNearbyListings,
  type DiscoveryListing,
} from "@/modules/listings/search";
import { getListingCommunity } from "@/modules/community/service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = listingSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return {};
  }

  const listing = await getListingBySlug(parsed.data);
  if (!listing) {
    return {};
  }

  const description = `${listing.name} in ${formatAddress(
    listing.address,
  )}. ${listing.description}`;

  return {
    title: listing.name,
    description,
    alternates: {
      canonical: `/place/${listing.slug}`,
    },
    openGraph: {
      title: listing.name,
      description,
      images: listing.media[0]?.url ? [listing.media[0].url] : undefined,
      type: "website",
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = listingSlugSchema.safeParse(slug);
  if (!parsed.success) {
    notFound();
  }

  const listing = await getListingBySlug(parsed.data);
  if (!listing) {
    notFound();
  }

  const nearby = await getNearbyListings(listing);
  const community = await getListingCommunity(listing.id);
  const jsonLd = buildListingJsonLd(listing);
  const crowd = crowdLabel(listing.attributes);
  const transportDestinations = await getTransportDestinations();
  const initialJourney =
    listing.lat !== null && listing.lng !== null
      ? await planJourney({
          origin: defaultOrigins[0],
          originLabel: defaultOrigins[0].label,
          destination: { lat: listing.lat, lng: listing.lng },
          destinationLabel: listing.name,
        })
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />

      <div className="mb-4">
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/search"
        >
          Back to search
        </Link>
      </div>

      <PhotoGallery listing={listing} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">
                {categoryLabels[listing.category]}
              </p>
              <h1 className="text-2xl font-semibold">{listing.name}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star
                    aria-hidden="true"
                    className="h-4 w-4 fill-accent text-accent"
                  />
                  {listing.ratingAvg.toFixed(1)} ({listing.ratingCount})
                </span>
                <span>{formatAddress(listing.address)}</span>
              </p>
            </div>
            <StatusBadges listing={listing} />
            <div className="flex flex-wrap gap-2">
              <CrowdBadge listing={listing} />
              <span className="inline-flex min-h-7 items-center rounded-sm border bg-muted px-2 text-xs font-medium text-muted-foreground">
                {crowd.source}
              </span>
            </div>
          </section>

          <section aria-labelledby="about-title" className="space-y-3">
            <h2 id="about-title" className="text-xl font-semibold">
              About
            </h2>
            <p className="leading-7 text-muted-foreground">
              {listing.description}
            </p>
          </section>

          <section aria-labelledby="amenities-title" className="space-y-3">
            <h2 id="amenities-title" className="text-xl font-semibold">
              Amenities
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {listing.amenities.map((amenity) => (
                <div
                  className="flex min-h-11 items-center rounded-md border bg-card px-3 text-sm shadow-sm"
                  key={amenity.slug}
                >
                  {amenity.name}
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="rates-title" className="space-y-3">
            <h2 id="rates-title" className="text-xl font-semibold">
              Rates
            </h2>
            <div className="grid gap-3">
              {listing.ratePlans.map((rate) => (
                <div
                  className="rounded-md border bg-card p-4 shadow-sm"
                  key={`${rate.name}-${rate.price}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{rate.name}</h3>
                      {rate.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {rate.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-semibold">{formatPrice(rate.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="transport-title" className="space-y-3">
            <h2 id="transport-title" className="text-xl font-semibold">
              How to get there
            </h2>
            <TransportPlanner
              destinations={transportDestinations}
              initialDestinationId={listing.slug}
              initialJourney={initialJourney}
              origins={defaultOrigins}
            />
            <Button asChild className="w-full" variant="secondary">
              <Link href={`/transport?to=${listing.slug}`}>
                Open full transport browser
              </Link>
            </Button>
          </section>

          <section aria-labelledby="reviews-title" className="space-y-3">
            <CommunityPanel
              listingId={listing.id}
              reviews={community.reviews.map((review) => ({
                ...review,
                createdAt: new Date(review.createdAt).toISOString(),
              }))}
              questions={community.questions.map((question) => ({
                ...question,
                createdAt: new Date(question.createdAt).toISOString(),
              }))}
              crowd={{
                level: community.crowd.level,
                source: community.crowd.source,
                label: community.crowd.label,
              }}
            />
          </section>

          <section aria-labelledby="location-title" className="space-y-3">
            <h2 id="location-title" className="text-xl font-semibold">
              Location
            </h2>
            <MapPanel listings={[listing, ...nearby]} />
          </section>

          {nearby.length > 0 ? (
            <section aria-labelledby="nearby-title" className="space-y-3">
              <h2 id="nearby-title" className="text-xl font-semibold">
                Nearby places
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {nearby.slice(0, 4).map((nearbyListing) => (
                  <ListingCardCompact
                    key={nearbyListing.id}
                    listing={nearbyListing}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Starts at</p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-semibold">
              <PhilippinePeso aria-hidden="true" className="h-5 w-5" />
              {listing.priceMin
                ? (listing.priceMin / 100).toLocaleString("en-PH")
                : "Ask"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {listing.bookingMode === "instant"
                ? "Choose your dates and pay the 50% downpayment to request this stay."
                : listing.bookingMode === "inquiry"
                  ? "Send a booking request. The owner confirms availability before payment."
                  : "Contact-only listing for this seed record."}
            </p>
            {listing.bookingMode === "none" ? (
              <Button className="mt-4 w-full" disabled>
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Booking unavailable
              </Button>
            ) : (
              <Button asChild className="mt-4 w-full">
                <Link href={`/book/${listing.slug}`}>
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />
                  {listing.bookingMode === "instant"
                    ? "Book now"
                    : "Request to book"}
                </Link>
              </Button>
            )}
            {listing.claimStatus === "unclaimed" ? (
              <Button asChild className="mt-3 w-full" variant="secondary">
                <Link href={`/portal/claims/new?listing=${listing.slug}`}>
                  Own this business?
                </Link>
              </Button>
            ) : listing.claimStatus === "claimed" ? (
              <Button asChild className="mt-3 w-full" variant="outline">
                <Link href={`/portal/claims/new?listing=${listing.slug}`}>
                  Request ownership transfer
                </Link>
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function buildListingJsonLd(listing: DiscoveryListing) {
  const type =
    listing.category === "restaurant"
      ? "Restaurant"
      : listing.category === "resort"
        ? "Resort"
        : "LocalBusiness";

  return {
    "@context": "https://schema.org",
    "@type": type,
    name: listing.name,
    description: listing.description,
    image: listing.media.map((media) => media.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address.street,
      addressLocality: listing.address.municipality,
      addressRegion: listing.address.province,
      postalCode: listing.address.postal_code,
      addressCountry: "PH",
    },
    geo:
      listing.lat !== null && listing.lng !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: listing.lat,
            longitude: listing.lng,
          }
        : undefined,
    aggregateRating:
      listing.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: listing.ratingAvg,
            reviewCount: listing.ratingCount,
          }
        : undefined,
    priceRange: listing.priceMin ? formatPrice(listing.priceMin) : undefined,
  };
}

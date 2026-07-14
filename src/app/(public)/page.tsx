import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  Bus,
  Coffee,
  Compass,
  MapPinned,
  Search,
  ShipWheel,
  Sparkles,
  Waves,
} from "lucide-react";

import { ListingCard } from "@/components/discovery/listing-card";
import { SearchControls } from "@/components/discovery/search-controls";
import { Button } from "@/components/ui/button";
import {
  getCollections,
  getFeaturedListings,
  type DiscoveryCollection,
} from "@/modules/listings/search";

const categories = [
  { href: "/search?category=resort", label: "Resorts", icon: Waves },
  { href: "/search?category=room", label: "Rooms", icon: BedDouble },
  { href: "/search?category=restaurant", label: "Food", icon: Coffee },
  { href: "/search?category=activity", label: "Activities", icon: Sparkles },
];

export default async function HomePage() {
  const [featuredListings, collections] = await Promise.all([
    getFeaturedListings(),
    getCollections(),
  ]);

  return (
    <div className="pb-12">
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-10">
          <div className="space-y-5">
            <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              Pasadya
            </p>
            <div className="inline-flex min-h-9 items-center gap-2 rounded-sm border bg-background px-3 text-sm text-muted-foreground shadow-sm">
              <Compass aria-hidden="true" className="h-4 w-4 text-primary" />
              Samal Island + Davao City
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-[32px]">
                Find local places you can compare, save, and actually reach.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Search resorts, rooms, food stops, and activities with clean
                filters, honest crowd signals, and a route entry point for Davao
                and Samal trips.
              </p>
            </div>
            <SearchControls compact filters={{ area: "samal" }} />
          </div>

          <div className="rounded-md border bg-background p-4 shadow-sm">
            <p className="text-sm font-semibold">Quick paths</p>
            <div className="mt-3 grid gap-2">
              <Button asChild variant="secondary">
                <Link href="/samal/resorts">
                  <Waves aria-hidden="true" className="h-4 w-4" />
                  Samal resorts
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/davao-city/restaurants">
                  <Coffee aria-hidden="true" className="h-4 w-4" />
                  Davao food stops
                </Link>
              </Button>
              <Button asChild>
                <Link href="/transport">
                  <ShipWheel aria-hidden="true" className="h-4 w-4" />
                  How to get there
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="categories-title"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="categories-title" className="text-xl font-semibold">
              Browse by category
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start broad, then narrow by area, amenities, budget, and crowd.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/search">
              <Search aria-hidden="true" className="h-4 w-4" />
              Search all
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                className="flex min-h-20 items-center gap-3 rounded-md border bg-card p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={category.href}
                key={category.label}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="font-semibold">{category.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="popular-title"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div>
          <h2 id="popular-title" className="text-xl font-semibold">
            Popular in the seed set
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Published listings with ratings, rates, amenities, and map
            coordinates.
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuredListings.slice(0, 6).map((listing, index) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              priority={index < 2}
            />
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <h2 className="text-xl font-semibold">How to get around</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Transport planning is built as a first-class pillar. Phase 03
              links users into the route area while full journey matching stays
              scoped to Phase 06.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              className="flex min-h-24 items-center gap-3 rounded-md border bg-background p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/transport"
            >
              <Bus aria-hidden="true" className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Jeepney routes</p>
                <p className="text-sm text-muted-foreground">Davao-first</p>
              </div>
            </Link>
            <Link
              className="flex min-h-24 items-center gap-3 rounded-md border bg-background p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/transport"
            >
              <MapPinned aria-hidden="true" className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Ferry links</p>
                <p className="text-sm text-muted-foreground">Samal access</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="collections-title"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div>
          <h2 id="collections-title" className="text-xl font-semibold">
            Guides and collections
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated landing pages for SEO and trip inspiration.
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {collections.map((collection) => (
            <CollectionCard collection={collection} key={collection.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CollectionCard({ collection }: { collection: DiscoveryCollection }) {
  return (
    <Link
      className="grid overflow-hidden rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[180px_1fr]"
      href={`/collections/${collection.slug}`}
    >
      <div className="relative aspect-[16/10] bg-muted sm:aspect-auto">
        {collection.coverImage ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(min-width: 768px) 180px, 100vw"
            src={collection.coverImage}
          />
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{collection.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {collection.description}
        </p>
      </div>
    </Link>
  );
}

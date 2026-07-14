import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingCard } from "@/components/discovery/listing-card";
import {
  getCollectionBySlug,
  getListingsForCollection,
} from "@/modules/listings/search";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) {
    return {};
  }

  return {
    title: collection.title,
    description: collection.description,
    alternates: {
      canonical: `/collections/${collection.slug}`,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) {
    notFound();
  }

  const listings = await getListingsForCollection(collection);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-medium text-primary">Collection</p>
        <h1 className="text-2xl font-semibold">{collection.title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {collection.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing, index) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            priority={index < 2}
          />
        ))}
      </div>
    </div>
  );
}

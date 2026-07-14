import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SearchResultsShell } from "@/components/discovery/search-results-shell";
import {
  areaOptions,
  categoryFromPathSegment,
  categoryLabels,
  isArea,
  searchListings,
} from "@/modules/listings/search";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}): Promise<Metadata> {
  const { area, category } = await params;
  const categoryValue = categoryFromPathSegment(category);
  if (!isArea(area) || !categoryValue) {
    return {};
  }

  return {
    title: `${areaOptions[area].label} ${categoryLabels[categoryValue]}`,
    description: `Browse ${categoryLabels[
      categoryValue
    ].toLowerCase()} in ${areaOptions[area].label}.`,
    alternates: {
      canonical: `/${area}/${category}`,
    },
  };
}

export default async function AreaCategoryPage({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}) {
  const { area, category } = await params;
  const categoryValue = categoryFromPathSegment(category);
  if (!isArea(area) || !categoryValue) {
    notFound();
  }

  const listings = await searchListings({
    area,
    category: categoryValue,
    limit: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-medium text-primary">
          {areaOptions[area].label}
        </p>
        <h1 className="text-2xl font-semibold">
          {categoryLabels[categoryValue]}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Compare seeded {categoryLabels[categoryValue].toLowerCase()} with map
          pins, ratings, rates, and public discovery filters.
        </p>
      </div>
      <SearchResultsShell listings={listings} />
    </div>
  );
}

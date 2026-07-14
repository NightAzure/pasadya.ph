import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SearchResultsShell } from "@/components/discovery/search-results-shell";
import { areaOptions, isArea, searchListings } from "@/modules/listings/search";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  if (!isArea(area)) {
    return {};
  }

  const areaDetails = areaOptions[area];
  return {
    title: `${areaDetails.label} places`,
    description: areaDetails.description,
    alternates: {
      canonical: `/${area}`,
    },
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isArea(area)) {
    notFound();
  }

  const listings = await searchListings({ area, limit: 24 });
  const areaDetails = areaOptions[area];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-medium text-primary">Area guide</p>
        <h1 className="text-2xl font-semibold">{areaDetails.label}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {areaDetails.description}
        </p>
      </div>
      <SearchResultsShell listings={listings} />
    </div>
  );
}

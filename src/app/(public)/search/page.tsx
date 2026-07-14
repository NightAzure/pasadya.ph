import type { Metadata } from "next";

import { SearchControls } from "@/components/discovery/search-controls";
import { SearchResultsShell } from "@/components/discovery/search-results-shell";
import {
  categoryLabels,
  parseSearchParams,
  searchListings,
} from "@/modules/listings/search";

export const metadata: Metadata = {
  title: "Search places",
  description:
    "Search and filter public listings across Samal Island and Davao City.",
  alternates: {
    canonical: "/search",
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseSearchParams(resolvedSearchParams);
  const listings = await searchListings(filters);
  const title = filters.category
    ? categoryLabels[filters.category]
    : "All public places";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-medium text-primary">
          Samal Island + Davao City
        </p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {listings.length} places found. Filter by budget, amenities, rating,
          booking type, crowd signal, and DOT accreditation.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-md border bg-card p-4 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-4 text-base font-semibold">Filters</h2>
          <SearchControls filters={filters} />
        </aside>
        <SearchResultsShell listings={listings} />
      </div>
    </div>
  );
}

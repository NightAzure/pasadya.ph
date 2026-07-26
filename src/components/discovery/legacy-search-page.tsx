import { SearchControls } from "@/components/discovery/search-controls";
import { SearchResultsShell } from "@/components/discovery/search-results-shell";
import {
  parseSearchParams,
  searchListings,
} from "@/modules/listings/search";

/**
 * Instant-rollback surface for `/search` when `SEARCH_V2_MODE=off` or a
 * gradual rollout bucket is not assigned Search 2.0.
 */
export async function LegacySearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseSearchParams(searchParams);
  const listings = await searchListings({ ...filters, limit: 24 });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 space-y-2">
        <h1 className="text-2xl font-semibold">Search places</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Browse Samal Island and Davao City listings. You are seeing the
          previous search layout while the newer experience is limited or
          temporarily unavailable.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SearchControls filters={filters} />
        </aside>
        <SearchResultsShell listings={listings} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LegacySearchPage } from "@/components/discovery/legacy-search-page";
import { SearchWorkspace } from "@/components/discovery/search-workspace";
import {
  shouldRunShadowComparison,
  shouldServeSearchV2,
} from "@/modules/search/feature-flag";
import {
  SEARCH_TIMEOUT_MS,
  withTimeout,
} from "@/modules/search/hardening";
import { searchListings } from "@/modules/search/service";
import { compareSearchShadow } from "@/modules/search/shadow";
import {
  searchQueryFromWorkspaceParams,
  type WorkspaceSearchParams,
} from "@/modules/search/workspace-contract";

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
  const cookieStore = await cookies();
  const rolloutBucket =
    cookieStore.get("pasadya_search_bucket")?.value ?? "anonymous";

  if (!shouldServeSearchV2(rolloutBucket)) {
    return <LegacySearchPage searchParams={resolvedSearchParams} />;
  }

  const query = searchQueryFromWorkspaceParams(
    resolvedSearchParams as WorkspaceSearchParams,
  );
  const response = await withTimeout(
    searchListings(query),
    SEARCH_TIMEOUT_MS,
    "Search timed out.",
  );

  if (shouldRunShadowComparison()) {
    void compareSearchShadow({
      query,
      v2Slugs: response.listings.map((listing) => listing.slug),
    });
  }

  return (
    <div className="w-full pb-20 lg:pb-10">
      <h1 className="sr-only">Search places in Samal Island and Davao City</h1>
      <SearchWorkspace initialQuery={query} initialResponse={response} />
    </div>
  );
}

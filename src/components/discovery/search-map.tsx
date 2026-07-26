"use client";

import dynamic from "next/dynamic";

import type { SearchResponse } from "@/modules/search/contracts";

export type SearchMapProps = {
  listings: SearchResponse["listings"];
  resultBounds: SearchResponse["resultBounds"];
  selectedListingId: string | null;
  hoveredListingId?: string | null;
  onSelectListing: (listingId: string) => void;
  onLocate: (point: { lat: number; lng: number }) => void;
  onReturnToList?: () => void;
  mobileFullscreen?: boolean;
};

const SearchMapCanvas = dynamic(
  () => import("@/components/discovery/search-map-canvas"),
  {
    ssr: false,
    loading: () => (
      <div
        aria-busy="true"
        aria-label="Loading map"
        className="flex h-full min-h-[420px] items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground"
        role="status"
      >
        Loading map…
      </div>
    ),
  },
);

/**
 * The interactive map is deliberately a separate client chunk. Search remains
 * fully usable while this module or its tile provider is unavailable.
 */
export function SearchMap(props: SearchMapProps) {
  return <SearchMapCanvas {...props} />;
}

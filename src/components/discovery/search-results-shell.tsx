"use client";

import { useState } from "react";
import { List, Map } from "lucide-react";

import { ListingCard } from "@/components/discovery/listing-card";
import { MapPanel } from "@/components/discovery/map-panel";
import type { DiscoveryListing } from "@/modules/listings/discovery";

export function SearchResultsShell({
  listings,
}: {
  listings: DiscoveryListing[];
}) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-md border bg-card p-1 shadow-sm lg:hidden">
        <button
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm text-sm font-medium ${
            view === "list" ? "bg-primary text-primary-foreground" : ""
          }`}
          onClick={() => setView("list")}
          type="button"
        >
          <List aria-hidden="true" className="h-4 w-4" />
          List
        </button>
        <button
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm text-sm font-medium ${
            view === "map" ? "bg-primary text-primary-foreground" : ""
          }`}
          onClick={() => setView("map")}
          type="button"
        >
          <Map aria-hidden="true" className="h-4 w-4" />
          Map
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,45%)]">
        <div className={view === "map" ? "hidden lg:block" : "grid gap-4"}>
          {listings.length > 0 ? (
            listings.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                priority={index < 2}
              />
            ))
          ) : (
            <div className="rounded-md border bg-card p-6 text-center shadow-sm">
              <h2 className="text-xl font-semibold">No places found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing filters or searching a broader Davao or Samal term.
              </p>
            </div>
          )}
        </div>

        <div
          className={
            view === "list"
              ? "hidden lg:sticky lg:top-24 lg:block lg:self-start"
              : "block"
          }
        >
          <MapPanel listings={listings} />
        </div>
      </div>
    </div>
  );
}

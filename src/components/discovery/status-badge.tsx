import {
  BadgeCheck,
  CalendarCheck,
  CircleAlert,
  CircleDot,
  ShieldCheck,
} from "lucide-react";

import {
  crowdLabel,
  type DiscoveryListing,
} from "@/modules/listings/discovery";

export function StatusBadges({ listing }: { listing: DiscoveryListing }) {
  return (
    <div className="flex flex-wrap gap-2">
      {listing.claimStatus === "claimed" ? (
        <span className="inline-flex min-h-7 items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 text-xs font-medium text-foreground">
          <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 text-success" />
          Verified owner
        </span>
      ) : (
        <span className="inline-flex min-h-7 items-center gap-1 rounded-sm border bg-muted px-2 text-xs font-medium text-muted-foreground">
          <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
          Unclaimed
        </span>
      )}
      {listing.dotAccredited ? (
        <span className="inline-flex min-h-7 items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 text-xs font-medium text-foreground">
          <ShieldCheck
            aria-hidden="true"
            className="h-3.5 w-3.5 text-success"
          />
          DOT accredited
        </span>
      ) : null}
      {listing.bookingMode === "instant" ? (
        <span className="inline-flex min-h-7 items-center gap-1 rounded-sm border border-primary/30 bg-primary/10 px-2 text-xs font-medium text-foreground">
          <CalendarCheck
            aria-hidden="true"
            className="h-3.5 w-3.5 text-primary"
          />
          Instant book
        </span>
      ) : null}
    </div>
  );
}

export function CrowdBadge({ listing }: { listing: DiscoveryListing }) {
  const crowd = crowdLabel(listing.attributes);
  const tone =
    crowd.level === "quiet"
      ? "bg-success/10 text-foreground border-success/30"
      : crowd.level === "moderate"
        ? "bg-warning/10 text-foreground border-warning/30"
        : "bg-destructive/10 text-foreground border-destructive/30";

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1 rounded-sm border px-2 text-xs font-medium ${tone}`}
      title={crowd.source}
    >
      <CircleDot aria-hidden="true" className="h-3.5 w-3.5" />
      {crowd.label}
    </span>
  );
}

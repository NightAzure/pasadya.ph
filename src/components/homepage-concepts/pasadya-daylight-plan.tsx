import { ArrowRight, Route } from "lucide-react";

import { TrackedHomepageLink } from "@/components/homepage-concepts/pasadya-daylight-analytics";
import styles from "@/components/homepage-concepts/pasadya-daylight.module.css";
import type { DiscoveryListing } from "@/modules/listings/search";
import type {
  FerrySchedule,
  TransportRoute,
} from "@/modules/transport/service";

export function PasadyaDaylightPlannerTeaser({
  ferry,
  listings,
  route,
}: {
  ferry: FerrySchedule | undefined;
  listings: DiscoveryListing[];
  route: TransportRoute | undefined;
}) {
  const routeLabel = ferry?.routeName ?? route?.name ?? "Local route guide";
  const routeDetail = ferry
    ? `About ${ferry.durationMinutes} minutes, excluding waiting time`
    : "Check published route details before leaving";

  return (
    <section
      aria-labelledby="plan-title"
      className={`${styles.section} ${styles.planTeaserSection}`}
      id="plan"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Plan after you find a place</p>
            <h2 id="plan-title">Build a Day That Fits</h2>
          </div>
          <p>
            Save a few places, compare travel time, and shape a realistic day.
          </p>
        </div>

        <div className={styles.planTeaserCard}>
          <ol aria-label="Example day plan" className={styles.planTeaserStops}>
            {listings.slice(0, 3).map((listing, index) => (
              <li key={listing.id}>
                <span aria-hidden="true">{index + 1}</span>
                <div>
                  <small>{listing.category.replaceAll("_", " ")}</small>
                  <strong>{listing.name}</strong>
                  <p>{listingLocation(listing)}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.planTeaserRoute}>
            <div className={styles.planTeaserRouteIcon}>
              <Route aria-hidden="true" />
            </div>
            <div>
              <p>Route reference</p>
              <strong>{routeLabel}</strong>
              <span>{routeDetail}</span>
            </div>
            <TrackedHomepageLink
              analyticsEvent="homepage_planner_teaser_click"
              className={styles.primaryLink}
              href="/search"
            >
              Find Your First Stop
              <ArrowRight aria-hidden="true" />
            </TrackedHomepageLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function listingLocation(listing: DiscoveryListing) {
  return (
    listing.address.barangay ??
    listing.address.municipality ??
    listing.address.province ??
    "Davao region"
  );
}

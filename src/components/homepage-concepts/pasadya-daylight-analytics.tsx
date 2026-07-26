"use client";

import Link from "next/link";
import type { ComponentProps, FormEvent, ReactNode } from "react";

export type HomepageAnalyticsEvent =
  | "homepage_search_submit"
  | "homepage_quick_start_click"
  | "homepage_listing_open"
  | "homepage_planner_teaser_click"
  | "homepage_transport_click";

type AnalyticsProperties = Record<string, boolean | number | string>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackHomepageEvent(
  event: HomepageAnalyticsEvent,
  properties: AnalyticsProperties = {},
) {
  const detail = { event, ...properties };
  window.dispatchEvent(
    new CustomEvent("pasadya:analytics", {
      detail,
    }),
  );
  window.dataLayer?.push(detail);
}

export function HomepageSearchForm({
  children,
  ...props
}: Omit<ComponentProps<"form">, "onSubmit"> & { children: ReactNode }) {
  function trackSearch(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const query = String(form.get("q") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();

    trackHomepageEvent("homepage_search_submit", {
      location: location || "all",
      queryPresent: query.length > 0,
    });
  }

  return (
    <form {...props} onSubmit={trackSearch}>
      {children}
    </form>
  );
}

export function TrackedHomepageLink({
  analyticsEvent,
  analyticsProperties,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  analyticsEvent: HomepageAnalyticsEvent;
  analyticsProperties?: AnalyticsProperties;
  children: ReactNode;
}) {
  return (
    <Link
      {...props}
      onClick={() =>
        trackHomepageEvent(analyticsEvent, analyticsProperties ?? {})
      }
    >
      {children}
    </Link>
  );
}

"use client";

type ClientAction =
  | "filter_apply"
  | "filter_remove"
  | "map_open"
  | "list_open"
  | "search_this_area"
  | "result_click"
  | "booking_click"
  | "tile_failure"
  | "geocoder_failure";

/**
 * Fire-and-forget privacy-safe UI metrics. Never include coordinates, query
 * text, listing ids, or user identifiers in the payload.
 */
export function trackSearchUiEvent(action: ClientAction) {
  if (typeof window === "undefined") return;
  const viewport =
    window.innerWidth < 768
      ? "mobile"
      : window.innerWidth < 1024
        ? "tablet"
        : "desktop";
  void fetch("/api/search/metrics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, viewport }),
    keepalive: true,
  }).catch(() => {
    /* metrics must never break search */
  });
}

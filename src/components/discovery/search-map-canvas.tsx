"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  ChevronLeft,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import type { SearchMapProps } from "@/components/discovery/search-map";
import styles from "@/components/discovery/search-workspace.module.css";
import { cn } from "@/lib/utils";
import { trackSearchUiEvent } from "@/modules/search/client-metrics";
import { LOCATION_PRIVACY_SHORT } from "@/modules/search/privacy";

type MapFeatureProperties = {
  id: string;
  name: string;
  priceLabel: string;
  price?: number;
  selected: boolean;
  hovered: boolean;
  hasRoute: boolean;
};

const sourceId = "search-listings";
const clusterLayerId = "search-clusters";
const clusterCountLayerId = "search-cluster-count";
const placeLayerId = "search-places";
const priceLayerId = "search-place-prices";
const unpricedLayerId = "search-place-neutral";

export default function SearchMapCanvas({
  listings,
  resultBounds,
  selectedListingId,
  hoveredListingId = null,
  onSelectListing,
  onLocate,
  onReturnToList,
  mobileFullscreen = false,
}: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullMapRef = useRef<HTMLElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fittedInitialBounds = useRef(false);
  const suppressMoveUntil = useRef(0);
  const focusedListingId = useRef<string | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "unavailable" | "error"
  >(() => (mapStyleUrl() ? "loading" : "unavailable"));
  const [error, setError] = useState<string | null>(() =>
    mapStyleUrl()
      ? null
      : "Map tiles are not configured. You can continue with the list.",
  );
  const [isFullMap, setIsFullMap] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const tilesConfigured = Boolean(mapStyleUrl());
  const features = useMemo(
    () => toFeatureCollection(listings, selectedListingId, hoveredListingId),
    [hoveredListingId, listings, selectedListingId],
  );
  const mappableCount = features.features.length;
  const featuresRef = useRef(features);
  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  const updateSource = useCallback(() => {
    const source = mapRef.current?.getSource(sourceId) as
      GeoJSONSource | undefined;
    source?.setData(features);
  }, [features]);

  useEffect(() => {
    updateSource();
  }, [updateSource]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const style = mapStyleUrl();
    if (!style) {
      return;
    }

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [125.64, 7.08],
        zoom: 9,
        attributionControl: false,
      });
    } catch {
      queueMicrotask(() => {
        setStatus("unavailable");
        setError(
          "This device cannot start the interactive map. You can continue with the list.",
        );
      });
      return;
    }
    mapRef.current = map;

    map.on("load", () => {
      map.resize();
      map.addSource(sourceId, {
        type: "geojson",
        data: featuresRef.current,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });
      map.addLayer({
        id: clusterLayerId,
        type: "circle",
        source: sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#087F78",
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 24, 50, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "case",
            ["boolean", ["get", "hasRoute"], false],
            "#087F78",
            "#FFFFFF",
          ],
        },
      });
      map.addLayer({
        id: clusterCountLayerId,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#FFFFFF" },
      });
      map.addLayer({
        id: placeLayerId,
        type: "circle",
        source: sourceId,
        filter: ["all", ["!", ["has", "point_count"]]],
        paint: {
          "circle-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#087F78",
            ["boolean", ["get", "hovered"], false],
            "#D95D43",
            ["has", "price"],
            "#244A8F",
            "#526071",
          ],
          "circle-radius": [
            "case",
            ["boolean", ["get", "selected"], false],
            22,
            ["boolean", ["get", "hovered"], false],
            20,
            ["has", "price"],
            18,
            15,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });
      map.addLayer({
        id: priceLayerId,
        type: "symbol",
        source: sourceId,
        filter: ["all", ["!", ["has", "point_count"]], ["has", "price"]],
        layout: {
          "text-field": ["get", "priceLabel"],
          "text-size": 11,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#FFFFFF" },
      });
      map.addLayer({
        id: unpricedLayerId,
        type: "symbol",
        source: sourceId,
        filter: ["all", ["!", ["has", "point_count"]], ["!", ["has", "price"]]],
        layout: { "text-field": "•", "text-size": 22 },
        paint: { "text-color": "#FFFFFF" },
      });

      map.on("click", clusterLayerId, (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        const geometry = feature?.geometry;
        if (
          typeof clusterId !== "number" ||
          !source ||
          !geometry ||
          geometry.type !== "Point"
        )
          return;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
          });
        });
      });
      map.on("click", placeLayerId, (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectListing(id);
      });
      for (const layer of [clusterLayerId, placeLayerId]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
      map.on("moveend", () => {
        if (Date.now() < suppressMoveUntil.current) return;
        if (!fittedInitialBounds.current) return;
      });
      if (resultBounds) {
        suppressMoveUntil.current = Date.now() + 800;
        fitToBounds(map, resultBounds);
        fittedInitialBounds.current = true;
      }
      setStatus("ready");
    });
    map.on("error", () => {
      setStatus("error");
      trackSearchUiEvent("tile_failure");
      setError(
        "Map tiles could not load. You can continue with the list or retry.",
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Feature data is updated separately; this only recreates the canvas after
    // an explicit provider/WebGL retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !resultBounds || !map.isStyleLoaded()) return;
    if (!fittedInitialBounds.current) {
      suppressMoveUntil.current = Date.now() + 800;
      fitToBounds(map, resultBounds);
      fittedInitialBounds.current = true;
      return;
    }
    // Search result changes must never refit the user's viewport after their
    // initial destination search. The explicit reset control remains available.
  }, [resultBounds]);

  useEffect(() => {
    if (!selectedListingId) {
      focusedListingId.current = null;
      return;
    }
    if (status !== "ready") return;
    if (focusedListingId.current === selectedListingId) return;
    const listing = listings.find((item) => item.id === selectedListingId);
    const map = mapRef.current;
    if (!map || !listing?.coordinates) return;
    focusedListingId.current = selectedListingId;
    suppressMoveUntil.current = Date.now() + 900;
    const targetZoom = Math.max(map.getZoom(), 14);
    map.easeTo({
      center: [listing.coordinates.lng, listing.coordinates.lat],
      zoom: targetZoom,
      duration: 750,
      padding: mobileFullscreen
        ? { top: 72, bottom: 300, left: 36, right: 64 }
        : { top: 48, bottom: 48, left: 48, right: 48 },
    });
  }, [listings, mobileFullscreen, selectedListingId, status]);

  useEffect(() => {
    mapRef.current?.resize();
    if (!isFullMap && !mobileFullscreen) return;
    const section = fullMapRef.current;
    section?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !section) return;
      const focusable = [
        ...section.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [isFullMap, mobileFullscreen]);

  const retry = () => {
    mapRef.current?.remove();
    mapRef.current = null;
    fittedInitialBounds.current = false;
    setStatus("loading");
    setError(null);
    setMapVersion((version) => version + 1);
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable in this browser. Choose a named area instead.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        suppressMoveUntil.current = Date.now() + 1_200;
        mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 13 });
        onLocate(point);
      },
      () =>
        setError(
          "Location permission was not granted. Choose a named area or origin instead.",
        ),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };
  const reset = () => {
    const map = mapRef.current;
    if (!map) return;
    suppressMoveUntil.current = Date.now() + 800;
    map.resetNorth();
    if (resultBounds) {
      fitToBounds(map, resultBounds);
    }
  };
  const modalMap = isFullMap || mobileFullscreen;

  return (
    <section
      aria-label="Search map"
      aria-modal={modalMap || undefined}
      className={cn(
        mobileFullscreen
          ? styles.mobileMapSection
          : isFullMap
            ? styles.fullMapSection
            : styles.mapSection,
      )}
      ref={fullMapRef}
      role={modalMap ? "dialog" : undefined}
    >
      <div
        aria-label="Interactive search map"
        className={
          mobileFullscreen
            ? styles.mobileMapFrame
            : isFullMap
              ? styles.fullMapFrame
              : styles.mapFrame
        }
        role="region"
      >
        {/* Explicit size: MapLibre's `.maplibregl-map { position: relative }` overrides Tailwind `absolute`. */}
        <div className={styles.mapCanvas} ref={containerRef} />
        {status !== "ready" ? (
          <div className={styles.mapFallback}>
            <div className={styles.mapFallbackCard}>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
                <MapIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xl font-semibold">
                {status === "loading" && tilesConfigured
                  ? "Loading map"
                  : "Map unavailable"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {error ??
                  (tilesConfigured
                    ? "The list remains available while map data loads."
                    : "Map tiles are not configured. You can continue with the list.")}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {status === "error" ? (
                  <Button onClick={retry} type="button" variant="secondary">
                    Retry map
                  </Button>
                ) : null}
                {onReturnToList ? (
                  <Button onClick={onReturnToList} type="button">
                    Continue with list
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {mobileFullscreen && onReturnToList ? (
          <button
            aria-label="Return to list"
            className={styles.mobileMapBack}
            onClick={onReturnToList}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        ) : null}
        <div className={styles.mapControls}>
          {!mobileFullscreen ? (
            <>
              <MapControl
                label="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
              >
                <ZoomIn aria-hidden="true" />
              </MapControl>
              <MapControl
                label="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
              >
                <ZoomOut aria-hidden="true" />
              </MapControl>
            </>
          ) : null}
          <MapControl
            label={`Use my current location. ${LOCATION_PRIVACY_SHORT}`}
            onClick={locate}
          >
            <LocateFixed aria-hidden="true" />
          </MapControl>
          <MapControl label="Reset map orientation and results" onClick={reset}>
            <RotateCcw aria-hidden="true" />
          </MapControl>
          {!mobileFullscreen ? (
            <MapControl
              label={isFullMap ? "Collapse map" : "Expand map"}
              onClick={() => setIsFullMap((value) => !value)}
            >
              {isFullMap ? (
                <Minimize2 aria-hidden="true" />
              ) : (
                <Maximize2 aria-hidden="true" />
              )}
            </MapControl>
          ) : null}
        </div>
        {!mobileFullscreen ? (
          <div className={styles.mapCount}>
            <p className="font-semibold">
              {listings.length} matching{" "}
              {listings.length === 1 ? "place" : "places"}
            </p>
            {mappableCount !== listings.length ? (
              <p className="mt-0.5 text-muted-foreground">
                {mappableCount} shown here; the rest have no public location.
              </p>
            ) : null}
          </div>
        ) : null}
        <p className={styles.attribution}>
          <a
            href="https://www.maptiler.com/copyright/"
            rel="noreferrer"
            target="_blank"
          >
            © MapTiler
          </a>{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            rel="noreferrer"
            target="_blank"
          >
            © OpenStreetMap contributors
          </a>
        </p>
      </div>
      <p aria-live="polite" className="sr-only">
        {selectedListingId
          ? "Selected map place updated."
          : "Map results updated."}
      </p>
    </section>
  );
}

function MapControl({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={styles.mapControl}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function toFeatureCollection(
  listings: SearchMapProps["listings"],
  selectedId: string | null,
  hoveredId: string | null,
): FeatureCollection<Point, MapFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: listings.flatMap((listing) => {
      if (!listing.coordinates) return [];
      const price = listing.matchedRate?.total ?? null;
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [listing.coordinates.lng, listing.coordinates.lat],
          },
          properties: {
            id: listing.id,
            name: listing.name,
            priceLabel: price === null ? "" : formatPinPrice(price),
            selected: listing.id === selectedId,
            hovered: listing.id === hoveredId,
            hasRoute: listing.route !== null,
            ...(price === null ? {} : { price }),
          },
        },
      ];
    }),
  };
}

function formatPinPrice(amount: number) {
  const pesos = amount / 100;
  return pesos >= 1_000
    ? `₱${Math.round(pesos / 1_000)}k`
    : `₱${Math.round(pesos)}`;
}

function mapStyleUrl() {
  const explicit = process.env.NEXT_PUBLIC_MAPTILER_MAP_STYLE_URL;
  if (explicit) return explicit;
  const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  return key
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`
    : null;
}

function fitToBounds(
  map: MapLibreMap,
  bounds: NonNullable<SearchMapProps["resultBounds"]>,
) {
  const samePoint =
    bounds.west === bounds.east && bounds.south === bounds.north;
  if (samePoint) map.easeTo({ center: [bounds.west, bounds.south], zoom: 13 });
  else
    map.fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      { padding: 48, maxZoom: 14, duration: 0 },
    );
}

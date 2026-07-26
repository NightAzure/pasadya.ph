"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  clampToLaunchRegion,
  LAUNCH_REGION,
  pinPercentInLaunchRegion,
  type LaunchPoint,
} from "@/lib/launch-region";
import type { GeocodeSuggestion } from "@/modules/geocoding/types";

type SearchResponse = {
  ok?: boolean;
  suggestions?: GeocodeSuggestion[];
  attribution?: string;
  source?: "maptiler" | "development";
  error?: string;
};

function setFormField(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function readFormAddress(form: HTMLFormElement | null) {
  if (!form) return "";
  return ["street", "barangay", "municipality", "province"]
    .map((name) => {
      const field = form.elements.namedItem(name);
      return field instanceof HTMLInputElement ? field.value.trim() : "";
    })
    .filter(Boolean)
    .join(", ");
}

export function LocationConfirmation({
  initial,
  address,
}: {
  initial: LaunchPoint | null;
  address: string;
}) {
  const listId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState(initial ?? LAUNCH_REGION.defaultPoint);
  const [confirmed, setConfirmed] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(address);
  const [query, setQuery] = useState(address);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [attribution, setAttribution] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listOpen, setListOpen] = useState(false);
  const pin = pinPercentInLaunchRegion(point);
  const resolved = resolvedAddress.trim() || "Address details still needed";
  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 3;
  const visibleSuggestions = canSearch ? suggestions : [];

  useEffect(() => {
    const form = panel.current?.closest("form");
    if (!form) return;
    const syncAddress = () => {
      const next = readFormAddress(form);
      setResolvedAddress(next);
      setConfirmed(false);
    };
    form.addEventListener("input", syncAddress);
    return () => form.removeEventListener("input", syncAddress);
  }, []);

  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `/api/geocoding/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as SearchResponse;
        if (!response.ok) {
          setSuggestions([]);
          setSearchError(payload.error ?? "Address search failed.");
          setListOpen(true);
          return;
        }
        setSuggestions(payload.suggestions ?? []);
        setAttribution(payload.attribution ?? "");
        setActiveIndex(-1);
        setListOpen(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchError(
          error instanceof Error ? error.message : "Address search failed.",
        );
        setListOpen(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canSearch, trimmedQuery]);

  function applySuggestion(suggestion: GeocodeSuggestion) {
    const next = clampToLaunchRegion({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setPoint(next);
    setResolvedAddress(suggestion.placeName);
    setQuery(suggestion.placeName);
    setConfirmed(false);
    setListOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);

    const form = panel.current?.closest("form");
    if (!form) return;
    if (suggestion.street) setFormField(form, "street", suggestion.street);
    if (suggestion.barangay) setFormField(form, "barangay", suggestion.barangay);
    if (suggestion.municipality) {
      setFormField(form, "municipality", suggestion.municipality);
    }
    if (suggestion.province) setFormField(form, "province", suggestion.province);
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = panel.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.min(
      1,
      Math.max(0, (event.clientY - bounds.top) / bounds.height),
    );
    const width = LAUNCH_REGION.maxLongitude - LAUNCH_REGION.minLongitude;
    const height = LAUNCH_REGION.maxLatitude - LAUNCH_REGION.minLatitude;
    setPoint({
      latitude: Number(
        (LAUNCH_REGION.maxLatitude - y * height).toFixed(6),
      ),
      longitude: Number(
        (LAUNCH_REGION.minLongitude + x * width).toFixed(6),
      ),
    });
    setConfirmed(false);
  }

  function nudge(latitude: number, longitude: number) {
    setPoint((current) =>
      clampToLaunchRegion({
        latitude: current.latitude + latitude,
        longitude: current.longitude + longitude,
      }),
    );
    setConfirmed(false);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen || visibleSuggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        index < visibleSuggestions.length - 1 ? index + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index > 0 ? index - 1 : visibleSuggestions.length - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      applySuggestion(visibleSuggestions[activeIndex]!);
    } else if (event.key === "Escape") {
      setListOpen(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Search for an address, choose a suggestion to place the pin, then
        confirm. You can still drag or nudge the pin; coordinates are for review
        only and never need typing.
      </p>

      <div className="relative grid gap-2">
        <label className="block">
          <span className="text-sm font-medium">Address search</span>
          <input
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={listOpen}
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setQuery(event.target.value);
              setListOpen(true);
              setActiveIndex(-1);
              if (event.target.value.trim().length < 3) {
                setSearchError(null);
              }
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search Samal or Davao City addresses"
            role="combobox"
            type="search"
            value={query}
          />
        </label>
        {listOpen && canSearch ? (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-background shadow-sm"
            id={listId}
            role="listbox"
          >
            {searching ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Searching…
              </p>
            ) : null}
            {searchError ? (
              <p className="px-3 py-2 text-sm text-destructive" role="alert">
                {searchError}
              </p>
            ) : null}
            {!searching &&
            !searchError &&
            visibleSuggestions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No launch-area matches yet. Keep typing or place the pin
                manually.
              </p>
            ) : null}
            <ul className="max-h-56 overflow-auto py-1">
              {visibleSuggestions.map((suggestion, index) => (
                <li key={suggestion.id}>
                  <button
                    aria-selected={index === activeIndex}
                    className={`flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      index === activeIndex ? "bg-muted" : "hover:bg-muted/70"
                    }`}
                    onClick={() => applySuggestion(suggestion)}
                    role="option"
                    type="button"
                  >
                    <span className="font-medium">{suggestion.label}</span>
                    <span className="text-muted-foreground">
                      {suggestion.placeName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {attribution ? (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                {attribution}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        aria-label={`${LAUNCH_REGION.label} location picker`}
        className="relative h-52 touch-none overflow-hidden rounded-lg border bg-gradient-to-br from-cyan-50 via-background to-emerald-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={move}
        onPointerMove={(event) => event.buttons === 1 && move(event)}
        ref={panel}
        role="application"
        tabIndex={0}
      >
        <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm">
          {LAUNCH_REGION.label}
        </span>
        <span className="absolute bottom-3 left-3 right-3 text-xs text-muted-foreground">
          Keyboard alternative: use the nudge controls or “Reset to Davao City
          centre”, then confirm the displayed address.
        </span>
        <span
          className="absolute -translate-x-1/2 -translate-y-full text-2xl"
          aria-hidden="true"
          style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
        >
          ●
        </span>
      </div>
      <div
        aria-label="Adjust pin with keyboard"
        className="grid grid-cols-3 gap-2 self-start"
      >
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border bg-background px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(0.0005, 0)}
          type="button"
        >
          North
        </button>
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border bg-background px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(0, -0.0005)}
          type="button"
        >
          West
        </button>
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border bg-background px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(0, 0.0005)}
          type="button"
        >
          East
        </button>
        <span aria-hidden="true" />
        <button
          className="min-h-11 rounded-md border bg-background px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => nudge(-0.0005, 0)}
          type="button"
        >
          South
        </button>
        <span aria-hidden="true" />
      </div>
      <button
        className="min-h-11 rounded-md border bg-background px-3 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          setPoint(LAUNCH_REGION.defaultPoint);
          setConfirmed(false);
        }}
        type="button"
      >
        Reset to Davao City centre
      </button>
      <div
        aria-live="polite"
        className="rounded-md border bg-muted/30 p-3 text-sm"
      >
        <p className="font-medium">Resolved address</p>
        <p className="mt-1 text-muted-foreground">{resolved}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
        </p>
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 text-sm font-medium">
        <input
          checked={confirmed}
          name="locationConfirmed"
          onChange={(event) => setConfirmed(event.target.checked)}
          required
          type="checkbox"
          value="true"
        />
        I confirm this pin and resolved address are correct.
      </label>
      <input name="latitude" type="hidden" value={point.latitude} />
      <input name="longitude" type="hidden" value={point.longitude} />
    </div>
  );
}

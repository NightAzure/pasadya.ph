"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  BedDouble,
  Check,
  ChevronUp,
  Coffee,
  Compass,
  Grid2X2,
  Heart,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Waves,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import {
  emptyRouteDraft,
  routeFromDraft,
  SearchFilterSheet,
  type SessionRouteDraft,
} from "@/components/discovery/search-filter-sheet";
import { SearchMap } from "@/components/discovery/search-map";
import styles from "@/components/discovery/search-workspace.module.css";
import layoutStyles from "@/components/homepage-concepts/sunlit-field-guide.module.css";
import { cn } from "@/lib/utils";
import type {
  SearchQuery,
  SearchResponse,
  SearchSuggestion,
} from "@/modules/search/contracts";
import { trackSearchUiEvent } from "@/modules/search/client-metrics";
import {
  isSearchContextComplete,
  paramsFromSearchParams,
  searchQueryFromWorkspaceParams,
  workspaceUrl,
} from "@/modules/search/workspace-contract";

type Props = { initialQuery: SearchQuery; initialResponse: SearchResponse };
type ApiState =
  | { status: "ready"; response: SearchResponse }
  | { status: "error"; message: string };

const categoryNames: Record<string, string> = {
  resort: "Resorts",
  room: "Rooms & stays",
  restaurant: "Restaurants & cafes",
  activity: "Activities",
  service: "Services",
};
const categoryIcons = {
  resort: Waves,
  room: BedDouble,
  restaurant: Coffee,
  activity: Compass,
  service: Sparkles,
} as const;

const sortOptions = [
  { value: "best_match", label: "Best match" },
  { value: "rating", label: "Top rated" },
  { value: "verified_total", label: "Verified total" },
  { value: "newest", label: "Newest" },
] as const;
export function SearchWorkspace({ initialQuery, initialResponse }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [apiState, setApiState] = useState<ApiState>({
    status: "ready",
    response: initialResponse,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [mapSheetSnap, setMapSheetSnap] = useState<
    "hidden" | "compact" | "expanded"
  >("compact");
  // Never persist a visitor's precise location. It only survives while this
  // mounted workspace is open and is sent in the typed POST body when needed.
  const [sessionOrigin, setSessionOrigin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sessionRoute, setSessionRoute] =
    useState<SessionRouteDraft>(emptyRouteDraft);
  const [nearMatches, setNearMatches] = useState<SearchResponse | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ignoreClickUntil = useRef(0);
  const suppressClickCleanup = useRef<(() => void) | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const mobileMapButton = useRef<HTMLButtonElement>(null);

  const response = apiState.status === "ready" ? apiState.response : null;
  const selectedListingId =
    response?.listings.find((listing) => listing.slug === selectedSlug)?.id ??
    null;
  const storageKey = `search-workspace:${windowSafeSearch()}`;

  const fetchResults = useCallback(
    async (
      nextQuery: SearchQuery,
      options: {
        history?: "push" | "replace" | "none";
        url?: string;
        append?: boolean;
      } = {},
    ) => {
      controller.current?.abort();
      const currentRequest = ++requestId.current;
      const abort = new AbortController();
      controller.current = abort;
      setIsLoading(true);
      setApiState((state) => state);
      try {
        const result = await requestSearch(nextQuery, abort.signal);
        if (currentRequest !== requestId.current) return;
        setQuery(nextQuery);
        setApiState((previous) =>
          options.append && previous.status === "ready"
            ? {
                status: "ready",
                response: {
                  ...result,
                  listings: [...previous.response.listings, ...result.listings],
                },
              }
            : { status: "ready", response: result },
        );
        setNearMatches(null);
        if (options.url && options.history !== "none") {
          window.history[
            options.history === "push" ? "pushState" : "replaceState"
          ](
            { ...window.history.state, searchWorkspace: true },
            "",
            options.url,
          );
        }
        if (result.totalCount === 0 && hasRelaxableConstraint(nextQuery)) {
          void requestSearch(relaxedQuery(nextQuery), abort.signal)
            .then((near) => {
              if (currentRequest === requestId.current) setNearMatches(near);
            })
            .catch(() => undefined);
        }
      } catch (error) {
        if (abort.signal.aborted || currentRequest !== requestId.current)
          return;
        setApiState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Search is unavailable right now.",
        });
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    },
    [],
  );

  const updatePublicState = useCallback(
    (
      updates: Record<string, string | string[] | undefined>,
      history: "push" | "replace" = "push",
      routeDraft: SessionRouteDraft = sessionRoute,
    ) => {
      const current = new URLSearchParams(window.location.search);
      const url = workspaceUrl(current, updates);
      const params = new URLSearchParams(url.split("?")[1] ?? "");
      const route = routeFromDraft(routeDraft);
      void fetchResults(
        {
          ...searchQueryFromWorkspaceParams(paramsFromSearchParams(params)),
          ...(sessionOrigin ? { origin: sessionOrigin } : {}),
          ...(route ? { route } : { route: undefined }),
        },
        {
          history,
          url,
        },
      );
    },
    [fetchResults, sessionOrigin, sessionRoute],
  );

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as {
        selectedSlug?: string;
        scrollY?: number;
      };
      if (state.selectedSlug)
        requestAnimationFrame(() => setSelectedSlug(state.selectedSlug!));
      if (typeof state.scrollY === "number")
        requestAnimationFrame(() => window.scrollTo({ top: state.scrollY }));
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    const save = () =>
      window.sessionStorage.setItem(
        `search-workspace:${window.location.search}`,
        JSON.stringify({ selectedSlug, scrollY: window.scrollY }),
      );
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [selectedSlug]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const route = routeFromDraft(sessionRoute);
      void fetchResults(
        {
          ...searchQueryFromWorkspaceParams(paramsFromSearchParams(params)),
          ...(sessionOrigin ? { origin: sessionOrigin } : {}),
          ...(route ? { route } : {}),
        },
        {
          history: "none",
        },
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      controller.current?.abort();
      window.removeEventListener("popstate", handlePopState);
    };
  }, [fetchResults, sessionOrigin, sessionRoute]);

  useEffect(() => {
    // `.page { overflow: clip }` makes position:fixed descendants behave like
    // absolute inside that box on iOS and breaks FAB / sticky tap targets.
    const page = document.querySelector<HTMLElement>(`.${layoutStyles.page}`);
    if (!page) return;
    const previousOverflow = page.style.overflow;
    page.style.overflow = "visible";
    return () => {
      page.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    return () => {
      suppressClickCleanup.current?.();
      suppressClickCleanup.current = null;
    };
  }, []);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const sync = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--search-header-height",
        `${height}px`,
      );
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--search-header-height");
    };
  }, []);

  useEffect(() => {
    if (view !== "map") return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (desktop.matches) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setView("list");
        requestAnimationFrame(() => mobileMapButton.current?.focus());
      }
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setView("list");
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [view]);

  const removeChip = (key: string, value?: string) => {
    trackSearchUiEvent("filter_remove");
    if (key === "area") {
      updatePublicState({ area: undefined, location: undefined });
      return;
    }
    if (key === "dates") {
      updatePublicState({ checkIn: undefined, checkOut: undefined });
      return;
    }
    if (key === "party") {
      updatePublicState({
        pax: undefined,
        requestedUnits: undefined,
        rooms: undefined,
      });
      return;
    }
    if (key === "budget") {
      updatePublicState({
        minPrice: undefined,
        maxPrice: undefined,
        minTotal: undefined,
        maxTotal: undefined,
      });
      return;
    }
    if (key === "visitDate") {
      updatePublicState({ visitDate: undefined, visitTime: undefined });
      return;
    }
    if (key === "route") {
      setSessionRoute(emptyRouteDraft());
      void fetchResults(
        {
          ...query,
          route: undefined,
          cursor: undefined,
          ...(sessionOrigin ? { origin: sessionOrigin } : {}),
        },
        { history: "none" },
      );
      return;
    }
    const current = new URLSearchParams(window.location.search);
    if (value) {
      const remaining = current.getAll(key).filter((item) => item !== value);
      updatePublicState({ [key]: remaining });
      return;
    }
    updatePublicState({ [key]: undefined });
  };
  const selectListing = (
    listing: SearchResponse["listings"][number],
    scrollIntoView = false,
  ) => {
    setSelectedSlug(listing.slug);
    if (scrollIntoView)
      requestAnimationFrame(() =>
        cardRefs.current[listing.id]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        }),
      );
  };
  const tripContext = tripContextLabel(query);
  const filterCount = activeFilterCount(query);

  return (
    <section
      aria-label="Search workspace"
      className={styles.workspace}
      data-search-workspace
    >
      <div className={styles.toolbar}>
        <div className={styles.toolbarContent}>
          <div className={styles.searchRow}>
            <SearchComposer
              id="workspace-search"
              initialText={query.text ?? ""}
              onTextCommit={(text) =>
                updatePublicState({ q: text || undefined }, "replace")
              }
            />
            <button
              aria-label={
                filterCount
                  ? `Open filters, ${filterCount} active`
                  : "Open filters"
              }
              className={styles.filterButton}
              onClick={() => {
                if (Date.now() < ignoreClickUntil.current) return;
                setFiltersOpen(true);
              }}
              onPointerUp={(event) => {
                if (event.pointerType !== "touch") return;
                ignoreClickUntil.current = Date.now() + 500;
                setFiltersOpen(true);
              }}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" />
              <span className={styles.filterButtonLabel}>
                Filters{filterCount ? ` · ${filterCount}` : ""}
              </span>
              {filterCount ? (
                <span className={styles.filterCountBadge}>{filterCount}</span>
              ) : null}
            </button>
          </div>
          <div className={styles.toolbarSecondary}>
            <CategoryRail
              activeCategories={query.categories}
              onSelect={(category) =>
                updatePublicState({ category: category || undefined })
              }
            />
          </div>
        </div>
        {isLoading ? (
          <div aria-hidden="true" className={styles.loadingRail} />
        ) : null}
      </div>

      <div className={styles.workspaceBody}>
      <div className={styles.summaryRow}>
        <div className={styles.resultSummary}>
          <p aria-live="polite" className={styles.resultCount}>
            <MapPin aria-hidden="true" />
            {response?.totalCount ?? 0} exact{" "}
            {response?.totalCount === 1 ? "place" : "places"}
          </p>
        </div>
        <MenuSelect
          ariaLabel="Sort places"
          className={styles.sortControl}
          label="Sort"
          leadingIcon={<ArrowUpDown aria-hidden="true" />}
          onChange={(sort) => updatePublicState({ sort })}
          options={[...sortOptions]}
          value={query.sort}
          variant="pill"
        />
      </div>

      <div className={styles.mobileCategoryRow}>
        <CategoryRail
          activeCategories={query.categories}
          onSelect={(category) =>
            updatePublicState({ category: category || undefined })
          }
        />
      </div>

      <AppliedChips
        onClear={() => {
          setSessionRoute(emptyRouteDraft());
          updatePublicState(clearableParams());
        }}
        onRemove={removeChip}
        query={query}
      />

      {apiState.status === "error" ? (
        <div className={cn("mt-3", styles.errorState)} role="alert">
          <h2 className="text-xl font-semibold">Couldn’t refresh results</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {apiState.message}
          </p>
          <Button
            className="mt-4"
            onClick={() => void fetchResults(query)}
            type="button"
          >
            Try again
          </Button>
        </div>
      ) : null}

      {response?.totalCount === 0 && !isLoading ? (
        <EmptySearch
          diagnostics={response.diagnostics.failedConstraints}
          onClear={() => updatePublicState(clearableParams())}
          onEdit={() => setFiltersOpen(true)}
        />
      ) : response ? (
        <div className={cn(styles.split, styles.splitWithMap)}>
          <div
            aria-busy={isLoading}
            className={cn(
              styles.listPane,
              view === "map" && styles.listHiddenMobile,
            )}
          >
            <div
              className={cn(
                styles.resultsList,
                isLoading && styles.resultsLoading,
              )}
            >
              {response.listings.map((listing, index) => (
                <SearchResultCard
                  cardRef={(node) => {
                    cardRefs.current[listing.id] = node;
                  }}
                  isSelected={selectedSlug === listing.slug}
                  key={listing.id}
                  listing={listing}
                  onHover={setHoveredListingId}
                  onSelect={() => selectListing(listing)}
                  priority={index < 2}
                  tripContext={tripContext}
                />
              ))}
              {isLoading && response.listings.length === 0 ? (
                <CardSkeletons />
              ) : null}
            </div>
          </div>
          <div
            className={
              view === "map" ? styles.mobileMapHost : styles.mapDesktopColumn
            }
          >
            <div
              className={
                view === "map" ? styles.mobileMapFill : styles.mapDesktopHost
              }
            >
              <SearchMap
                hoveredListingId={hoveredListingId}
                listings={response.listings}
                mobileFullscreen={view === "map"}
                onLocate={(point) => {
                  setSessionOrigin(point);
                  const route = routeFromDraft(sessionRoute);
                  void fetchResults(
                    {
                      ...query,
                      bounds: undefined,
                      cursor: undefined,
                      origin: point,
                      radius: undefined,
                      ...(route ? { route } : { route: undefined }),
                    },
                    { history: "none" },
                  );
                }}
                onReturnToList={() => {
                  setView("list");
                  trackSearchUiEvent("list_open");
                  requestAnimationFrame(() =>
                    mobileMapButton.current?.focus(),
                  );
                }}
                onSelectListing={(listingId) => {
                  const listing = response.listings.find(
                    (item) => item.id === listingId,
                  );
                  if (listing) {
                    selectListing(listing, true);
                    setMapSheetSnap((current) =>
                      current === "hidden" ? "compact" : current,
                    );
                  }
                }}
                resultBounds={response.resultBounds}
                selectedListingId={selectedListingId}
              />
            </div>
          </div>
        </div>
      ) : null}

      {view === "map" && response?.listings.length ? (
        <MapResultsSheet
          activeCategories={query.categories}
          filterCount={filterCount}
          listings={response.listings}
          onCategorySelect={(category) =>
            updatePublicState({ category: category || undefined })
          }
          onOpenFilters={() => setFiltersOpen(true)}
          onSearchCommit={(text) =>
            updatePublicState({ q: text || undefined }, "replace")
          }
          onSelect={(listing) => selectListing(listing)}
          onSnapChange={setMapSheetSnap}
          onSortChange={(sort) => updatePublicState({ sort })}
          searchText={query.text ?? ""}
          selectedSlug={selectedSlug}
          snap={mapSheetSnap}
          sort={query.sort}
          tripContext={tripContext}
        />
      ) : null}

      {nearMatches && nearMatches.totalCount > 0 ? (
        <section aria-labelledby="near-matches" className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold" id="near-matches">
            Near matches
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These do not meet every selected condition.{" "}
            {response?.diagnostics.failedConstraints[0]}
          </p>
          <div className={cn("mt-4", styles.resultsList, styles.resultsGrid)}>
            {nearMatches.listings.map((listing) => (
              <SearchResultCard
                isSelected={selectedSlug === listing.slug}
                key={listing.id}
                listing={listing}
                onSelect={() => selectListing(listing)}
                tripContext={undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {response?.nextCursor ? (
        <div className="mt-6 flex justify-center">
          <Button
            disabled={isLoading}
            onClick={() => {
              void fetchResults(
                { ...query, cursor: response.nextCursor ?? undefined },
                { history: "none", append: true },
              );
            }}
            type="button"
            variant="secondary"
          >
            {isLoading ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : null}
            Load more places
          </Button>
        </div>
      ) : null}

      </div>

      {view === "list" && response?.listings.length ? (
        <div className={styles.mobileMapDock}>
          <button
            aria-label={`Show map with ${response.totalCount} matching places`}
            className={styles.mobileMapButton}
            onClick={() => {
              if (Date.now() < ignoreClickUntil.current) return;
              setMapSheetSnap("compact");
              setView("map");
              trackSearchUiEvent("map_open");
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== "touch") return;
              // Touch opens the map immediately; the browser then synthesizes a
              // click at the same point. By then the sheet cards are under the
              // finger, so block that ghost click from hitting "View details".
              event.preventDefault();
              event.stopPropagation();
              ignoreClickUntil.current = Date.now() + 500;
              suppressClickCleanup.current?.();
              suppressClickCleanup.current = suppressNextClick(500);
              setMapSheetSnap("compact");
              setView("map");
              trackSearchUiEvent("map_open");
            }}
            ref={mobileMapButton}
            type="button"
          >
            <MapIcon aria-hidden="true" />
            Map
          </button>
        </div>
      ) : null}

      {filtersOpen ? (
        <SearchFilterSheet
          current={new URLSearchParams(windowSafeSearch())}
          facets={response?.facets ?? null}
          hasOrigin={Boolean(sessionOrigin)}
              onApply={({ updates, route, clearOrphans }) => {
            setFiltersOpen(false);
            trackSearchUiEvent("filter_apply");
            const nextRoute = route ?? emptyRouteDraft();
            setSessionRoute(nextRoute);
            const nextUpdates = clearOrphans
              ? {
                  ...updates,
                  rateType: updates.rateType ?? [],
                  cancellation: updates.cancellation ?? [],
                  attr: updates.attr ?? [],
                  visitDate: updates.visitDate,
                  visitTime: updates.visitTime,
                  available: updates.available,
                }
              : updates;
            updatePublicState(nextUpdates, "push", nextRoute);
          }}
          onClose={() => setFiltersOpen(false)}
          resultCount={response?.totalCount ?? 0}
          routeDraft={sessionRoute}
        />
      ) : null}
    </section>
  );
}

function SearchComposer({
  initialText,
  onTextCommit,
  autoFocus = false,
  id = "workspace-search",
}: {
  initialText: string;
  onTextCommit: (text: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  const [text, setText] = useState(initialText);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const committedText = useRef(initialText);
  const suggestionsId = `${id}-suggestions`;

  useEffect(() => {
    committedText.current = initialText;
    const frame = requestAnimationFrame(() => setText(initialText));
    return () => cancelAnimationFrame(frame);
  }, [initialText]);
  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => {
      input.current?.focus();
      setFocused(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);
  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(text)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data: { suggestions?: SearchSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setActiveIndex(-1);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [focused, text]);
  useEffect(() => {
    if (text.trim() === committedText.current) return;
    const timer = window.setTimeout(() => onTextCommit(text.trim()), 350);
    committedText.current = text.trim();
    return () => window.clearTimeout(timer);
  }, [onTextCommit, text]);

  const choose = (suggestion: SearchSuggestion) => {
    setText(suggestion.label);
    setSuggestions([]);
    setFocused(false);
    committedText.current =
      suggestion.kind === "listing" ? suggestion.label : suggestion.value;
    onTextCommit(
      suggestion.kind === "listing" ? suggestion.label : suggestion.value,
    );
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      suggestions[activeIndex]
    ) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === "Escape") setSuggestions([]);
  };
  return (
    <form
      className={styles.composerForm}
      onSubmit={(event) => {
        event.preventDefault();
        committedText.current = text.trim();
        onTextCommit(text.trim());
        setSuggestions([]);
        input.current?.blur();
      }}
      role="search"
    >
      <label className="sr-only" htmlFor={id}>
        Find a place
      </label>
      <div className={styles.composerShell}>
        <input
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={suggestionsId}
          aria-expanded={focused && suggestions.length > 0}
          className={styles.composerInput}
          id={id}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder="Search Samal & Davao"
          ref={input}
          role="combobox"
          value={text}
        />
        {text ? (
          <button
            aria-label="Clear search"
            className={styles.composerClear}
            onClick={() => {
              setText("");
              setSuggestions([]);
              input.current?.focus();
            }}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
        <button
          aria-label="Search"
          className={styles.composerSubmit}
          type="submit"
        >
          <Search aria-hidden="true" />
        </button>
        {focused && suggestions.length ? (
          <ul
            className={styles.suggestions}
            id={suggestionsId}
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <li
                aria-selected={activeIndex === index}
                id={`${id}-suggestion-${index}`}
                key={`${suggestion.kind}-${suggestion.value}`}
                role="option"
              >
                <button
                  className={cn(
                    styles.suggestionButton,
                    activeIndex === index && styles.suggestionActive,
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(suggestion)}
                  type="button"
                >
                  <span className={styles.suggestionLabel}>
                    {suggestion.label}
                  </span>
                  <span className={styles.suggestionDetail}>
                    {suggestion.detail ?? suggestion.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only">
        {suggestions.length
          ? `${suggestions.length} suggestions available.`
          : ""}
      </p>
    </form>
  );
}

function CategoryRail({
  activeCategories,
  onSelect,
}: {
  activeCategories?: SearchQuery["categories"];
  onSelect: (category: string | undefined) => void;
}) {
  const ignoreClickUntil = useRef(0);
  return (
    <div aria-label="Place categories" className={styles.quickRail}>
      <button
        aria-pressed={!activeCategories?.length}
        className={cn(
          styles.quickChip,
          !activeCategories?.length && styles.quickChipActive,
        )}
        onClick={() => {
          if (Date.now() < ignoreClickUntil.current) return;
          onSelect(undefined);
        }}
        onPointerUp={(event) => {
          if (event.pointerType !== "touch") return;
          ignoreClickUntil.current = Date.now() + 500;
          onSelect(undefined);
        }}
        type="button"
      >
        <Grid2X2 aria-hidden="true" />
        All
      </button>
      {Object.entries(categoryNames).map(([value, label]) => {
        const Icon = categoryIcons[value as keyof typeof categoryIcons];
        const active = activeCategories?.includes(value as never) ?? false;
        return (
          <button
            aria-pressed={active}
            className={cn(styles.quickChip, active && styles.quickChipActive)}
            key={value}
            onClick={() => {
              if (Date.now() < ignoreClickUntil.current) return;
              onSelect(active ? undefined : value);
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== "touch") return;
              ignoreClickUntil.current = Date.now() + 500;
              onSelect(active ? undefined : value);
            }}
            type="button"
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AppliedChips({
  onClear,
  onRemove,
  query,
}: {
  onClear: () => void;
  onRemove: (key: string, value?: string) => void;
  query: SearchQuery;
}) {
  const chips: Array<{ key: string; value?: string; label: string }> = [];
  if (query.text) chips.push({ key: "q", label: `“${query.text}”` });
  if (query.area) chips.push({ key: "area", label: query.area });
  if (query.categories?.[0])
    chips.push({
      key: "category",
      label: categoryNames[query.categories[0]] ?? "Category",
    });
  if (query.checkIn && query.checkOut)
    chips.push({
      key: "dates",
      label: `${shortDate(query.checkIn)} – ${shortDate(query.checkOut)}`,
    });
  if (query.pax)
    chips.push({
      key: "party",
      label: `${query.pax} ${query.pax === 1 ? "guest" : "guests"}${
        query.rooms
          ? ` · ${query.rooms} ${query.rooms === 1 ? "room" : "rooms"}`
          : ""
      }`,
    });
  if (query.verifiedTotal)
    chips.push({ key: "budget", label: budgetChipLabel(query.verifiedTotal) });
  query.amenities?.forEach((value) =>
    chips.push({ key: "amenity", value, label: readableLabel(value) }),
  );
  if (query.ratingMin)
    chips.push({ key: "rating", label: `${query.ratingMin}+ rating` });
  if (query.bookingModes?.[0])
    chips.push({
      key: "bookingMode",
      label:
        query.bookingModes[0] === "instant"
          ? "Instant book"
          : query.bookingModes[0] === "inquiry"
            ? "Inquiry"
            : "Contact only",
    });
  if (query.crowdLevels?.[0])
    chips.push({
      key: "crowd",
      label: `${readableLabel(query.crowdLevels[0])} crowd`,
    });
  if (query.dotAccredited) chips.push({ key: "dot", label: "DOT accredited" });
  query.rateTypes?.forEach((value) =>
    chips.push({ key: "rateType", value, label: readableLabel(value) }),
  );
  query.cancellationPolicies?.forEach((value) =>
    chips.push({
      key: "cancellation",
      value,
      label: `${readableLabel(value)} cancellation`,
    }),
  );
  query.attributes?.forEach((attribute) =>
    chips.push({
      key: "attr",
      value: `${attribute.key}:${String(attribute.value)}`,
      label:
        attribute.key === "cuisine"
          ? readableLabel(String(attribute.value))
          : attribute.key === "duration_hours"
            ? `${attribute.value}h`
            : readableLabel(attribute.key),
    }),
  );
  if (query.visitAt)
    chips.push({
      key: "visitDate",
      label: `Visit ${query.visitAt.slice(0, 16).replace("T", " ")}`,
    });
  if (query.available)
    chips.push({ key: "available", label: "Available inventory" });
  if (query.route)
    chips.push({
      key: "route",
      label: query.route.maxDurationMin
        ? `Route ≤ ${query.route.maxDurationMin} min`
        : "Route limits",
    });
  if (!chips.length) return null;
  return (
    <div className={styles.appliedRow} aria-label="Applied filters">
      {chips.map((chip, index) => (
        <button
          className={styles.appliedChip}
          key={`${chip.key}-${chip.value ?? index}`}
          onClick={() => onRemove(chip.key, chip.value)}
          type="button"
        >
          {chip.label}
          <X aria-hidden="true" />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}
      <button className={styles.clearButton} onClick={onClear} type="button">
        Clear all
      </button>
    </div>
  );
}

type MapSheetSnap = "hidden" | "compact" | "expanded";

function suppressNextClick(durationMs = 450) {
  if (typeof document === "undefined") return () => {};
  const until = Date.now() + durationMs;
  const block = (event: MouseEvent) => {
    if (Date.now() > until) {
      document.removeEventListener("click", block, true);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    document.removeEventListener("click", block, true);
  };
  document.addEventListener("click", block, true);
  const timer = window.setTimeout(() => {
    document.removeEventListener("click", block, true);
  }, durationMs);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("click", block, true);
  };
}

function readSafeAreaBottom() {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;bottom:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  // Always keep a little lift above the home indicator / gesture bar.
  return Math.max(value, 0);
}

function mapSheetHeights(viewportHeight: number, safeBottom: number) {
  // Content heights first; safe area is added so nothing sits under the home bar.
  const hiddenContent = 84;
  const compactContent = 278;
  return {
    hidden: hiddenContent + Math.max(safeBottom, 8),
    compact: compactContent + Math.max(safeBottom, 8),
    expanded: Math.min(
      Math.round(viewportHeight * 0.72),
      viewportHeight - 48,
    ),
  } as const;
}

function nearestSnap(
  height: number,
  heights: ReturnType<typeof mapSheetHeights>,
  velocity: number,
): MapSheetSnap {
  const points: Array<[MapSheetSnap, number]> = [
    ["hidden", heights.hidden],
    ["compact", heights.compact],
    ["expanded", heights.expanded],
  ];
  if (velocity < -0.85) {
    const above = points.filter(([, value]) => value > height + 8);
    if (above.length) return above[0][0];
  }
  if (velocity > 0.85) {
    const below = points.filter(([, value]) => value < height - 8);
    if (below.length) return below[below.length - 1][0];
  }
  return points.reduce((best, point) =>
    Math.abs(point[1] - height) < Math.abs(best[1] - height) ? point : best,
  )[0];
}

function scrollMapSheetToSelection(
  scroller: HTMLElement,
  card: HTMLElement,
  mode: "compact" | "expanded",
) {
  if (mode === "compact") {
    const target =
      card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const nextLeft = Math.min(maxScroll, Math.max(0, target));
    const previousSnap = scroller.style.scrollSnapType;
    scroller.style.scrollSnapType = "none";
    scroller.scrollTo({ left: nextLeft, behavior: "smooth" });
    window.setTimeout(() => {
      scroller.style.scrollSnapType = previousSnap;
    }, 520);
    return;
  }
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function MapResultsSheet({
  listings,
  snap,
  onSnapChange,
  onSelect,
  selectedSlug,
  tripContext,
  searchText,
  onSearchCommit,
  filterCount,
  onOpenFilters,
  activeCategories,
  onCategorySelect,
  sort,
  onSortChange,
}: {
  listings: SearchResponse["listings"];
  snap: MapSheetSnap;
  onSnapChange: (snap: MapSheetSnap) => void;
  onSelect: (listing: SearchResponse["listings"][number]) => void;
  selectedSlug: string | null;
  tripContext?: string;
  searchText: string;
  onSearchCommit: (text: string) => void;
  filterCount: number;
  onOpenFilters: () => void;
  activeCategories?: SearchQuery["categories"];
  onCategorySelect: (category: string | undefined) => void;
  sort: SearchQuery["sort"];
  onSortChange: (sort: string) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const skipSelectionScroll = useRef(false);
  const drag = useRef<{
    startY: number;
    startHeight: number;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [safeBottom, setSafeBottom] = useState(8);
  const heights = useMemo(
    () => mapSheetHeights(viewportHeight, safeBottom),
    [safeBottom, viewportHeight],
  );
  const [height, setHeight] = useState(() =>
    mapSheetHeights(800, 8).compact,
  );
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const sync = () => {
      setViewportHeight(window.innerHeight);
      setSafeBottom(readSafeAreaBottom());
    };
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    if (dragging) return;
    setHeight(heights[snap]);
  }, [dragging, heights, snap]);

  useEffect(() => {
    if (snap === "hidden" || !selectedSlug || !scrollerRef.current) return;
    if (skipSelectionScroll.current) {
      skipSelectionScroll.current = false;
      return;
    }
    const active = scrollerRef.current.querySelector<HTMLElement>(
      `[data-sheet-slug="${selectedSlug}"]`,
    );
    if (!active) return;
    scrollMapSheetToSelection(
      scrollerRef.current,
      active,
      snap === "expanded" ? "expanded" : "compact",
    );
  }, [selectedSlug, snap]);

  const expandedMode = snap === "expanded";
  const selectFromSheet = (listing: SearchResponse["listings"][number]) => {
    skipSelectionScroll.current = true;
    onSelect(listing);
  };

  const onHandlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = {
      startY: event.clientY,
      startHeight: height,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocity: 0,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onHandlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const now = performance.now();
    const deltaY = event.clientY - drag.current.startY;
    const next = Math.min(
      heights.expanded,
      Math.max(heights.hidden, drag.current.startHeight - deltaY),
    );
    const dt = Math.max(1, now - drag.current.lastTime);
    drag.current.velocity = (event.clientY - drag.current.lastY) / dt;
    drag.current.lastY = event.clientY;
    drag.current.lastTime = now;
    setHeight(next);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const velocity = drag.current.velocity;
    const nextSnap = nearestSnap(height, heights, velocity);
    drag.current = null;
    setDragging(false);
    onSnapChange(nextSnap);
    requestAnimationFrame(() => {
      setHeight(heights[nextSnap]);
    });
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
  };

  return (
    <div
      aria-label="Map place results"
      className={cn(styles.mapSheet, dragging && styles.mapSheetDragging)}
      ref={sheetRef}
      style={{ height }}
    >
      <div
        aria-expanded={snap !== "hidden"}
        className={cn(
          styles.mapSheetHandleHit,
          snap === "hidden" && styles.mapSheetHandleNeedle,
        )}
        onPointerCancel={endDrag}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        role="separator"
      >
        <span aria-hidden="true" className={styles.mapSheetHandle} />
        {snap === "hidden" ? (
          <span className={styles.mapSheetNeedlePill}>
            <MapPin aria-hidden="true" />
            <span className={styles.mapSheetNeedleCopy}>
              <strong>Browse places</strong>
              <span>{listings.length} matches on the map</span>
            </span>
            <ChevronUp aria-hidden="true" className={styles.mapSheetNeedleChevron} />
          </span>
        ) : (
          <span className={styles.mapSheetSummary}>
            {listings.length} {listings.length === 1 ? "place" : "places"} on the map
          </span>
        )}
      </div>

      {snap !== "hidden" || height > heights.hidden + 18 ? (
        <div className={styles.mapSheetBody}>
          {expandedMode ? (
            <div className={styles.mapSheetTools}>
              <div className={styles.mapSheetSearchRow}>
                <SearchComposer
                  id="map-sheet-search"
                  initialText={searchText}
                  onTextCommit={onSearchCommit}
                />
                <button
                  aria-label={
                    filterCount
                      ? `Open filters, ${filterCount} active`
                      : "Open filters"
                  }
                  className={styles.mapSheetFilterButton}
                  onClick={onOpenFilters}
                  type="button"
                >
                  <SlidersHorizontal aria-hidden="true" />
                  {filterCount ? (
                    <span className={styles.filterCountBadge}>{filterCount}</span>
                  ) : null}
                </button>
                <MenuSelect
                  ariaLabel={`Sort places, ${sortOptions.find((option) => option.value === sort)?.label ?? "Best match"}`}
                  className={styles.mapSheetSort}
                  leadingIcon={<ArrowUpDown aria-hidden="true" />}
                  onChange={onSortChange}
                  options={[...sortOptions]}
                  value={sort}
                  variant="icon"
                />
              </div>
              <CategoryRail
                activeCategories={activeCategories}
                onSelect={onCategorySelect}
              />
            </div>
          ) : null}

          {expandedMode ? (
            <div className={styles.mapSheetExpandedList} ref={scrollerRef}>
              {listings.map((listing) => (
                <MapSheetRowCard
                  isSelected={listing.slug === selectedSlug}
                  key={listing.id}
                  listing={listing}
                  onSelect={() => selectFromSheet(listing)}
                  tripContext={tripContext}
                />
              ))}
            </div>
          ) : (
            <div className={styles.mapSheetCarousel} ref={scrollerRef}>
              {listings.map((listing) => (
                <MapSheetCard
                  isSelected={listing.slug === selectedSlug}
                  key={listing.id}
                  listing={listing}
                  onSelect={() => selectFromSheet(listing)}
                  tripContext={tripContext}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MapSheetCard({
  listing,
  isSelected,
  onSelect,
  tripContext,
}: {
  listing: SearchResponse["listings"][number];
  isSelected: boolean;
  onSelect: () => void;
  tripContext?: string;
}) {
  const travelerFavorite =
    listing.rating.average >= 4.7 &&
    listing.rating.count >= 10 &&
    listing.rating.confidence >= 0.7;
  const tags = mapSheetTags(listing);

  return (
    <article
      className={cn(styles.mapSheetCard, isSelected && styles.mapSheetCardActive)}
      data-sheet-slug={listing.slug}
    >
      <button
        aria-label={`Select ${listing.name}`}
        aria-pressed={isSelected}
        className={styles.mapSheetCardHit}
        onClick={onSelect}
        type="button"
      >
        <span className={styles.mapSheetCardMedia}>
          {listing.image ? (
            <Image
              alt={listing.image.alt}
              className={styles.mapSheetCardImage}
              fill
              sizes="260px"
              src={listing.image.url}
            />
          ) : (
            <span className={styles.mapSheetCardPending}>Photo pending</span>
          )}
          {travelerFavorite ? (
            <span className={styles.mapSheetCardBadge}>
              <Star aria-hidden="true" />
              Popular
            </span>
          ) : (
            <span className={styles.mapSheetCardCategory}>
              {categoryNames[listing.category] ?? listing.category}
            </span>
          )}
          <span aria-hidden="true" className={styles.mapSheetCardHeart}>
            <Heart />
          </span>
        </span>
      </button>
      <div className={styles.mapSheetCardBody}>
        <div className={styles.mapSheetCardHeading}>
          <h2 className={styles.mapSheetCardTitle}>{listing.name}</h2>
          <span className={styles.mapSheetCardRating}>
            <Star aria-hidden="true" />
            {listing.rating.average.toFixed(1)}
          </span>
        </div>
        <p className={styles.mapSheetCardLocation}>
          <MapPin aria-hidden="true" />
          {listing.area ?? "Area not listed"}
        </p>
        {tags.length ? (
          <div className={styles.mapSheetCardTags}>
            {tags.map((tag) => (
              <span className={styles.mapSheetCardTag} key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.mapSheetCardFooter}>
          <div className={styles.mapSheetCardPrice}>
            {listing.matchedRate ? (
              <>
                <span className={styles.mapSheetCardVerified}>
                  <Check aria-hidden="true" />
                  Verified total
                </span>
                <strong>{formatMoney(listing.matchedRate.total)}</strong>
              </>
            ) : listing.startingPrice ? (
              <>
                <strong>{formatMoney(listing.startingPrice.amount)}</strong>
                <span className={styles.mapSheetCardPriceHint}>starting at</span>
              </>
            ) : (
              <strong>Price on request</strong>
            )}
          </div>
          <Link
            className={styles.mapSheetCardCta}
            href={`/place/${listing.slug}`}
            onClick={() => trackSearchUiEvent("result_click")}
          >
            View details
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function MapSheetRowCard({
  listing,
  isSelected,
  onSelect,
  tripContext,
}: {
  listing: SearchResponse["listings"][number];
  isSelected: boolean;
  onSelect: () => void;
  tripContext?: string;
}) {
  const travelerFavorite =
    listing.rating.average >= 4.7 &&
    listing.rating.count >= 10 &&
    listing.rating.confidence >= 0.7;
  const tags = mapSheetTags(listing);

  return (
    <article
      className={cn(styles.mapSheetRowCard, isSelected && styles.mapSheetCardActive)}
      data-sheet-slug={listing.slug}
    >
      <button
        aria-label={`Select ${listing.name}`}
        aria-pressed={isSelected}
        className={styles.mapSheetRowCardHit}
        onClick={onSelect}
        type="button"
      >
        <span className={styles.mapSheetRowCardMedia}>
          {listing.image ? (
            <Image
              alt={listing.image.alt}
              fill
              sizes="112px"
              src={listing.image.url}
            />
          ) : (
            <span className={styles.mapSheetCardPending}>Photo</span>
          )}
          {travelerFavorite ? (
            <span className={styles.mapSheetCardBadge}>
              <Star aria-hidden="true" />
              Popular
            </span>
          ) : null}
        </span>
        <span className={styles.mapSheetRowCardBody}>
          <span className={styles.mapSheetCardHeading}>
            <span className={styles.mapSheetCardTitle}>{listing.name}</span>
            <span className={styles.mapSheetCardRating}>
              <Star aria-hidden="true" />
              {listing.rating.average.toFixed(1)}
            </span>
          </span>
          <span className={styles.mapSheetCardLocation}>
            <MapPin aria-hidden="true" />
            {listing.area ?? "Area not listed"}
          </span>
          {listing.matchReasons[0] ? (
            <span className={styles.mapSheetCardCopy}>{listing.matchReasons[0]}</span>
          ) : null}
          {tags.length ? (
            <span className={styles.mapSheetCardTags}>
              {tags.map((tag) => (
                <span className={styles.mapSheetCardTag} key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
          <span className={styles.mapSheetCardFooter}>
            <span className={styles.mapSheetCardPrice}>
              {listing.matchedRate ? (
                <>
                  <span className={styles.mapSheetCardVerified}>
                    <Check aria-hidden="true" />
                    Verified total
                  </span>
                  <strong>{formatMoney(listing.matchedRate.total)}</strong>
                  <span className={styles.mapSheetCardPriceHint}>
                    {tripContext ? `for ${tripContext}` : listing.matchedRate.name}
                  </span>
                </>
              ) : listing.startingPrice ? (
                <>
                  <strong>{formatMoney(listing.startingPrice.amount)}</strong>
                  <span className={styles.mapSheetCardPriceHint}>starting at</span>
                </>
              ) : (
                <strong>Price on request</strong>
              )}
            </span>
            <Link
              className={styles.mapSheetCardCta}
              href={`/place/${listing.slug}`}
              onClick={(event) => {
                event.stopPropagation();
                trackSearchUiEvent("result_click");
              }}
            >
              View details
              <ArrowRight aria-hidden="true" />
            </Link>
          </span>
        </span>
      </button>
    </article>
  );
}

function mapSheetTags(listing: SearchResponse["listings"][number]) {
  const tags: string[] = [];
  if (listing.category === "resort" || listing.category === "room")
    tags.push("Stay");
  else if (listing.category === "restaurant") tags.push("Eat & drink");
  else if (listing.category === "activity") tags.push("Activity");
  else if (listing.category === "service") tags.push("Service");
  if (listing.bookingMode === "instant") tags.push("Instant book");
  if (listing.matchReasons[0]?.toLowerCase().includes("beach"))
    tags.push("Beachfront");
  if (listing.rating.average >= 4.6) tags.push("Family-friendly");
  return [...new Set(tags)].slice(0, 3);
}

function SearchResultCard({
  listing,
  priority = false,
  isSelected,
  onSelect,
  onHover,
  cardRef,
  tripContext,
}: {
  listing: SearchResponse["listings"][number];
  priority?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onHover?: (listingId: string | null) => void;
  cardRef?: (node: HTMLElement | null) => void;
  tripContext?: string;
}) {
  const travelerFavorite =
    listing.rating.average >= 4.7 &&
    listing.rating.count >= 10 &&
    listing.rating.confidence >= 0.7;
  return (
    <article
      className={cn(styles.resultCard, isSelected && styles.resultCardSelected)}
      data-listing-id={listing.id}
      onFocus={onSelect}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      ref={cardRef}
    >
      <Link
        className={styles.cardLink}
        href={`/place/${listing.slug}`}
        onClick={() => {
          trackSearchUiEvent("result_click");
          onSelect();
        }}
      >
        <div className={styles.cardMedia}>
          {listing.image ? (
            <Image
              alt={listing.image.alt}
              className={styles.cardImage}
              fetchPriority={priority ? "high" : "auto"}
              fill
              loading={priority ? "eager" : "lazy"}
              sizes="(min-width: 1024px) 28vw, (min-width: 640px) 42vw, 100vw"
              src={listing.image.url}
            />
          ) : (
            <div className={styles.photoPending}>Photo pending</div>
          )}
          {travelerFavorite ? (
            <span className={styles.cardBadge}>
              <Star aria-hidden="true" />
              Traveler favorite
            </span>
          ) : null}
          <span className={styles.cardCategory}>
            {categoryNames[listing.category] ?? listing.category}
          </span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <div className={styles.cardHeadingRow}>
              <h2 className={styles.cardTitle}>{listing.name}</h2>
              <span className={styles.rating}>
                <Star aria-hidden="true" />
                {listing.rating.average.toFixed(1)}
              </span>
            </div>
            <p className={styles.locationLine}>
              <MapPin aria-hidden="true" />
              <span>
                {listing.area ?? "Area not listed"} ·{" "}
                {reviewConfidence(
                  listing.rating.confidence,
                  listing.rating.count,
                )}
              </span>
            </p>
          </div>
          {listing.matchReasons.length ? (
            <p className={styles.matchReason}>{listing.matchReasons[0]}</p>
          ) : null}
          <div className={styles.evidenceRow}>
            {listing.dataWarnings.slice(0, 1).map((warning) => (
              <span
                className={cn(styles.evidenceTag, styles.warningTag)}
                key={warning}
              >
                {warning}
              </span>
            ))}
            <span className={styles.evidenceTag}>
              {listing.bookingMode === "instant"
                ? "Instant book"
                : listing.bookingMode === "inquiry"
                  ? "Inquiry"
                  : "Contact only"}
            </span>
          </div>
          <div className={styles.cardFooter}>
            <PriceLine listing={listing} tripContext={tripContext} />
            <div className={styles.cardActionGroup}>
              <span className={styles.routeState}>
                {listing.route
                  ? `~${listing.route.durationMin} min${
                      listing.route.transfers
                        ? ` · ${listing.route.transfers} transfers`
                        : ""
                    }${listing.route.modeled ? " · modeled estimate" : ""}`
                  : "Route unknown"}
              </span>
              <span className={styles.detailsCta}>
                View details
                <ArrowRight aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function PriceLine({
  listing,
  tripContext,
}: {
  listing: SearchResponse["listings"][number];
  tripContext?: string;
}) {
  if (listing.matchedRate)
    return (
      <p className={styles.priceLine}>
        <span className={cn(styles.pricePrimary, styles.pricePrimaryVerified)}>
          <Check aria-hidden="true" />
          Verified total {formatMoney(listing.matchedRate.total)}
        </span>
        <span className={styles.priceContext}>
          {listing.matchedRate.name}
          {tripContext ? ` · ${tripContext}` : ""}
        </span>
      </p>
    );
  if (listing.startingPrice)
    return (
      <p className={styles.priceLine}>
        <span className={styles.pricePrimary}>
          Starting at {formatMoney(listing.startingPrice.amount)}
        </span>
        <span className={styles.priceContext}>
          {listing.startingPrice.rateName} ·{" "}
          {readableLabel(listing.startingPrice.basis)} ·{" "}
          {trustLabel(listing.startingPrice.trust)}
        </span>
      </p>
    );
  return (
    <p className={styles.priceLine}>
      <span className={styles.pricePrimary}>Price unavailable</span>
      <span className={styles.priceContext}>
        View details or ask for rates.
      </span>
    </p>
  );
}

function EmptySearch({
  diagnostics,
  onClear,
  onEdit,
}: {
  diagnostics: string[];
  onClear: () => void;
  onEdit: () => void;
}) {
  return (
    <section className={cn("mt-3", styles.emptyState)}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
        <Search aria-hidden="true" className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-2xl font-semibold">No exact matches</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {diagnostics[0] ?? "No exact listings match these filters."}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={onEdit} type="button">
          Edit filters
        </Button>
        <Button onClick={onClear} type="button" variant="secondary">
          Clear all
        </Button>
      </div>
    </section>
  );
}
function CardSkeletons() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <div aria-hidden="true" className={styles.skeletonCard} key={index}>
          <div className="sm:grid sm:grid-cols-[42%_58%]">
            <div
              className={cn(
                "aspect-[16/10] sm:aspect-auto",
                styles.skeletonBlock,
              )}
            />
            <div className="space-y-3 p-4">
              <div className={cn("h-5 w-2/3 rounded", styles.skeletonBlock)} />
              <div className={cn("h-4 w-1/2 rounded", styles.skeletonBlock)} />
              <div
                className={cn("h-14 w-full rounded", styles.skeletonBlock)}
              />
              <div className={cn("h-9 w-full rounded", styles.skeletonBlock)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function clearableParams() {
  return {
    q: undefined,
    area: undefined,
    location: undefined,
    category: undefined,
    checkIn: undefined,
    checkOut: undefined,
    pax: undefined,
    rooms: undefined,
    requestedUnits: undefined,
    durationHours: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minTotal: undefined,
    maxTotal: undefined,
    available: undefined,
    amenity: [],
    rateType: [],
    cancellation: [],
    attr: [],
    visitDate: undefined,
    visitTime: undefined,
    rating: undefined,
    bookingMode: undefined,
    crowd: undefined,
    dot: undefined,
    sort: undefined,
  };
}
function activeFilterCount(query: SearchQuery) {
  return (
    (query.area ? 1 : 0) +
    (query.checkIn && query.checkOut ? 1 : 0) +
    (query.pax ? 1 : 0) +
    (query.verifiedTotal ? 1 : 0) +
    (query.amenities?.length ?? 0) +
    (query.ratingMin ? 1 : 0) +
    (query.bookingModes?.length ?? 0) +
    (query.crowdLevels?.length ?? 0) +
    (query.dotAccredited ? 1 : 0) +
    (query.rateTypes?.length ?? 0) +
    (query.cancellationPolicies?.length ?? 0) +
    (query.attributes?.length ?? 0) +
    (query.visitAt ? 1 : 0) +
    (query.available ? 1 : 0) +
    (query.route ? 1 : 0)
  );
}
function shortDate(value: string) {
  const [year, month, day] = value.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const label = months[Number(month) - 1];
  return label && year && day ? `${label} ${Number(day)}` : value;
}
function budgetChipLabel(budget: NonNullable<SearchQuery["verifiedTotal"]>) {
  if (budget.min !== undefined && budget.max !== undefined)
    return `${formatMoney(budget.min)} – ${formatMoney(budget.max)}`;
  if (budget.min !== undefined) return `From ${formatMoney(budget.min)}`;
  if (budget.max !== undefined) return `Up to ${formatMoney(budget.max)}`;
  return "Verified budget";
}
function readableLabel(value: string) {
  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function formatMoney(amount: number) {
  return `PHP ${(amount / 100).toLocaleString("en-PH")}`;
}
function tripContextLabel(query: SearchQuery) {
  if (!isSearchContextComplete(query)) return undefined;
  const rooms = query.rooms
    ? ` · ${query.rooms} ${query.rooms === 1 ? "unit" : "units"}`
    : "";
  return `${query.checkIn} to ${query.checkOut} · ${query.pax} ${query.pax === 1 ? "guest" : "guests"}${rooms}`;
}
function trustLabel(trust: string) {
  return readableLabel(trust);
}
function reviewConfidence(confidence: number, count: number) {
  return confidence >= 0.7
    ? `${count} reviews`
    : count
      ? `${count} reviews · limited confidence`
      : "No reviews yet";
}
function windowSafeSearch() {
  return typeof window === "undefined" ? "" : window.location.search;
}
function hasRelaxableConstraint(query: SearchQuery) {
  return Boolean(
    query.verifiedTotal ||
    query.available ||
    query.amenities?.length ||
    query.ratingMin ||
    query.bookingModes?.length ||
    query.crowdLevels?.length ||
    query.dotAccredited ||
    query.pax ||
    query.rooms ||
    query.rateTypes?.length ||
    query.attributes?.length ||
    query.cancellationPolicies?.length ||
    query.route,
  );
}
function relaxedQuery(query: SearchQuery): SearchQuery {
  const base = { ...query };
  delete base.verifiedTotal;
  delete base.available;
  delete base.pax;
  delete base.rooms;
  delete base.amenities;
  delete base.ratingMin;
  delete base.bookingModes;
  delete base.crowdLevels;
  delete base.dotAccredited;
  delete base.rateTypes;
  delete base.attributes;
  delete base.cancellationPolicies;
  delete base.route;
  delete base.visitAt;
  return base;
}
async function requestSearch(query: SearchQuery, signal?: AbortSignal) {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(query),
    signal,
  });
  const payload = (await response.json()) as
    SearchResponse | { error?: string };
  if (!response.ok)
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Search is unavailable right now.",
    );
  return payload as SearchResponse;
}

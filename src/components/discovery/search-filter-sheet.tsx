"use client";

import { Check, X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import styles from "@/components/discovery/search-workspace.module.css";
import { cn } from "@/lib/utils";
import {
  cuisineFilterOptions,
  getFilterProfile,
  orphanedCategoryFilters,
  unknownDataRule,
  type SearchCategory,
} from "@/modules/search/filter-registry";
import type { SearchQuery, SearchResponse } from "@/modules/search/contracts";
import { searchQueryFromWorkspaceParams } from "@/modules/search/workspace-contract";

export type SessionRouteDraft = {
  maxDurationMin: string;
  maxFare: string;
  maxWalkingM: string;
  maxTransfers: string;
  modes: string[];
  required: boolean;
};

export type FilterApplyPayload = {
  updates: Record<string, string | string[] | undefined>;
  route: SessionRouteDraft | null;
  clearOrphans: boolean;
};

type Props = {
  current: URLSearchParams;
  facets: SearchResponse["facets"] | null;
  hasOrigin: boolean;
  onApply: (payload: FilterApplyPayload) => void;
  onClose: () => void;
  resultCount: number;
  routeDraft: SessionRouteDraft;
};

export function SearchFilterSheet({
  current,
  facets,
  hasOrigin,
  onApply,
  onClose,
  resultCount,
  routeDraft,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [initialDraft] = useState(() => filterDraft(current, routeDraft));
  const [draft, setDraft] = useState(initialDraft);
  const [confirmClear, setConfirmClear] = useState(false);
  const draftChanged = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const category = (current.get("category") ?? undefined) as
    | SearchCategory
    | undefined;
  const profile = getFilterProfile(category ? [category] : undefined);
  const previewQuery = searchQueryFromWorkspaceParams(
    Object.fromEntries(current.entries()),
  );
  const orphans = orphanedCategoryFilters(
    {
      ...previewQuery,
      rateTypes: draft.rateTypes as SearchQuery["rateTypes"],
      cancellationPolicies:
        draft.cancellations as SearchQuery["cancellationPolicies"],
      attributes: draftAttributes(draft),
      visitAt: draft.visitDate
        ? `${draft.visitDate}T${draft.visitTime || "12:00"}:00+08:00`
        : undefined,
      available: draft.available || undefined,
      rooms: draft.rooms ? Number(draft.rooms) : undefined,
    },
    profile,
  );

  const close = useCallback(() => {
    onClose();
    window.setTimeout(() => opener.current?.focus(), 0);
  }, [onClose]);

  const ignoreDismissUntil = useRef(0);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
    const node = dialog.current;
    if (!node) return;

    ignoreDismissUntil.current = Date.now() + 500;
    const show = window.setTimeout(() => {
      // Delay past the opening tap so iOS doesn't dismiss via the same gesture.
      ignoreDismissUntil.current = Date.now() + 400;
      if (!node.open) node.showModal();
    }, 40);

    const onCancel = (event: Event) => {
      event.preventDefault();
      if (Date.now() < ignoreDismissUntil.current) return;
      close();
    };

    node.addEventListener("cancel", onCancel);
    return () => {
      window.clearTimeout(show);
      node.removeEventListener("cancel", onCancel);
      if (node.open) node.close();
    };
  }, [close]);

  const apply = (clearOrphans: boolean) => {
    const hasTripContext = Boolean(
      draft.checkIn && draft.checkOut && draft.pax,
    );
    const attributes: string[] = [];
    if (profile.controls.has("stayMode")) {
      if (draft.dayUse) attributes.push("day_use:true");
      if (draft.overnight) attributes.push("overnight:true");
    }
    if (profile.controls.has("cuisine"))
      draft.cuisines.forEach((value) => attributes.push(`cuisine:${value}`));
    if (profile.controls.has("durationHours") && draft.durationHours)
      attributes.push(`duration_hours:${draft.durationHours}`);

    const updates: Record<string, string | string[] | undefined> = {
      area: draft.area || undefined,
      checkIn: draft.checkIn || undefined,
      checkOut: draft.checkOut || undefined,
      pax: draft.pax || undefined,
      requestedUnits: profile.controls.has("rooms")
        ? draft.rooms || undefined
        : undefined,
      rooms: profile.controls.has("rooms") ? draft.rooms || undefined : undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minTotal: hasTripContext ? draft.minTotal || undefined : undefined,
      maxTotal: hasTripContext ? draft.maxTotal || undefined : undefined,
      available:
        hasTripContext && profile.controls.has("available") && draft.available
          ? "1"
          : undefined,
      amenity: draft.amenities,
      rateType: profile.controls.has("rateTypes") ? draft.rateTypes : [],
      cancellation: profile.controls.has("cancellation")
        ? draft.cancellations
        : [],
      attr: profile.controls.has("cuisine") ||
      profile.controls.has("durationHours") ||
      profile.controls.has("stayMode")
        ? attributes
        : [],
      visitDate: profile.controls.has("visitAt")
        ? draft.visitDate || undefined
        : undefined,
      visitTime: profile.controls.has("visitAt")
        ? draft.visitTime || undefined
        : undefined,
      rating: draft.rating || undefined,
      bookingMode: draft.bookingMode || undefined,
      crowd: draft.crowd || undefined,
      dot: draft.dot ? "1" : undefined,
    };

    const route =
      hasOrigin && profile.controls.has("route")
        ? {
            maxDurationMin: draft.maxDurationMin,
            maxFare: draft.maxFare,
            maxWalkingM: draft.maxWalkingM,
            maxTransfers: draft.maxTransfers,
            modes: draft.modes,
            required: draft.routeRequired,
          }
        : null;

    onApply({ updates, route, clearOrphans });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (orphans.length && !confirmClear) {
      setConfirmClear(true);
      return;
    }
    apply(confirmClear && orphans.length > 0);
  };

  return (
    <dialog
      aria-labelledby="filter-title"
      className={styles.filtersDialog}
      onCancel={(event) => {
        event.preventDefault();
        if (Date.now() < ignoreDismissUntil.current) return;
        close();
      }}
      ref={dialog}
    >
      <form className={styles.filterForm} onSubmit={submit}>
        <span aria-hidden="true" className={styles.sheetHandle} />
        <div className={styles.filterHeader}>
          <div>
            <h2 className={styles.filterTitle} id="filter-title">
              More filters
            </h2>
            <p className={styles.filterSubtitle}>
              {profile.label}
              {profile.explanation ? ` · ${profile.explanation}` : ""}
            </p>
          </div>
          <button
            aria-label="Close filters"
            className={styles.filterClose}
            onClick={close}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.filterBody}>
          {profile.explanation ? (
            <p className={styles.filterNotice} role="status">
              {profile.explanation}
            </p>
          ) : null}

          {show("area") ? (
            <FilterInput
              label="Area or barangay"
              value={draft.area}
              onChange={(value) => setDraft({ ...draft, area: value })}
            />
          ) : null}

          {show("dates") ? (
            <>
              <FilterInput
                label="Check-in"
                type="date"
                value={draft.checkIn}
                onChange={(value) => setDraft({ ...draft, checkIn: value })}
              />
              <FilterInput
                label="Check-out"
                type="date"
                value={draft.checkOut}
                onChange={(value) => setDraft({ ...draft, checkOut: value })}
              />
            </>
          ) : null}

          {show("visitAt") ? (
            <>
              <FilterInput
                hint={unknownDataRule("visitAt")}
                label="Visit date"
                type="date"
                value={draft.visitDate}
                onChange={(value) => setDraft({ ...draft, visitDate: value })}
              />
              <FilterInput
                label="Visit time"
                type="time"
                value={draft.visitTime}
                onChange={(value) => setDraft({ ...draft, visitTime: value })}
              />
            </>
          ) : null}

          {show("pax") ? (
            <FilterInput
              label={profile.group === "dining" ? "Party size" : "Guests"}
              max="100"
              min="1"
              type="number"
              value={draft.pax}
              onChange={(value) => setDraft({ ...draft, pax: value })}
            />
          ) : null}

          {show("rooms") ? (
            <FilterInput
              label="Rooms / units"
              max="20"
              min="1"
              type="number"
              value={draft.rooms}
              onChange={(value) => setDraft({ ...draft, rooms: value })}
            />
          ) : null}

          {show("verifiedTotal") ? (
            <>
              <FilterInput
                disabled={!(draft.checkIn && draft.checkOut && draft.pax)}
                hint={`${profile.priceBasisLabel}. ${unknownDataRule("verifiedTotal")}`}
                label="Verified total, minimum (PHP)"
                min="0"
                type="number"
                value={draft.minTotal}
                onChange={(value) => setDraft({ ...draft, minTotal: value })}
              />
              <FilterInput
                disabled={!(draft.checkIn && draft.checkOut && draft.pax)}
                hint="Requires dates and guests"
                label="Verified total, maximum (PHP)"
                min="0"
                type="number"
                value={draft.maxTotal}
                onChange={(value) => setDraft({ ...draft, maxTotal: value })}
              />
            </>
          ) : null}

          {show("available") ? (
            <label className={styles.filterCheckRow}>
              <input
                checked={draft.available}
                disabled={!(draft.checkIn && draft.checkOut && draft.pax)}
                onChange={(event) =>
                  setDraft({ ...draft, available: event.target.checked })
                }
                type="checkbox"
              />
              <span>
                Only show available inventory
                <span className={styles.filterFieldHint}>
                  {" "}
                  · {unknownDataRule("available")}
                </span>
              </span>
            </label>
          ) : null}

          {show("stayMode") ? (
            <fieldset className={styles.filterSection}>
              <legend className={styles.filterSectionTitle}>Stay mode</legend>
              <div className={styles.filterChipRow}>
                <ToggleChip
                  checked={draft.overnight}
                  label="Overnight"
                  onChange={(checked) =>
                    setDraft({ ...draft, overnight: checked })
                  }
                />
                <ToggleChip
                  checked={draft.dayUse}
                  label="Day-use"
                  onChange={(checked) =>
                    setDraft({ ...draft, dayUse: checked })
                  }
                />
              </div>
            </fieldset>
          ) : null}

          {show("rateTypes") ? (
            <CountedFieldset
              counts={facets?.rateTypes}
              label="Pricing type"
              options={profile.rateTypes}
              selected={draft.rateTypes}
              onToggle={(value, checked) =>
                setDraft({
                  ...draft,
                  rateTypes: checked
                    ? [...draft.rateTypes, value]
                    : draft.rateTypes.filter((item) => item !== value),
                })
              }
            />
          ) : null}

          {show("cuisine") ? (
            <CountedFieldset
              counts={facets?.cuisines}
              label="Cuisine"
              options={cuisineFilterOptions()}
              selected={draft.cuisines}
              onToggle={(value, checked) =>
                setDraft({
                  ...draft,
                  cuisines: checked
                    ? [...draft.cuisines, value]
                    : draft.cuisines.filter((item) => item !== value),
                })
              }
            />
          ) : null}

          {show("durationHours") ? (
            <FilterInput
              hint={unknownDataRule("durationHours")}
              label="Duration (hours)"
              max="24"
              min="1"
              type="number"
              value={draft.durationHours}
              onChange={(value) =>
                setDraft({ ...draft, durationHours: value })
              }
            />
          ) : null}

          {show("cancellation") ? (
            <CountedFieldset
              counts={facets?.cancellationPolicies}
              label="Cancellation terms"
              options={[
                { value: "flexible", label: "Flexible" },
                { value: "moderate", label: "Moderate" },
                { value: "strict", label: "Strict" },
              ]}
              selected={draft.cancellations}
              onToggle={(value, checked) =>
                setDraft({
                  ...draft,
                  cancellations: checked
                    ? [...draft.cancellations, value]
                    : draft.cancellations.filter((item) => item !== value),
                })
              }
            />
          ) : null}

          <SelectInput
            label="Minimum rating"
            value={draft.rating}
            onChange={(value) => setDraft({ ...draft, rating: value })}
            options={[
              ["", "Any rating"],
              ["4.5", "4.5+"],
              ["4", "4.0+"],
              ["3", "3.0+"],
            ]}
          />
          <SelectInput
            label="Booking"
            value={draft.bookingMode}
            onChange={(value) => setDraft({ ...draft, bookingMode: value })}
            options={[
              ["", "Any booking type"],
              ["instant", "Instant book"],
              ["inquiry", "Inquiry"],
              ["none", "Contact only"],
            ]}
          />
          <SelectInput
            label="Crowd"
            value={draft.crowd}
            onChange={(value) => setDraft({ ...draft, crowd: value })}
            options={[
              ["", "Any crowd level"],
              ["quiet", "Quiet"],
              ["moderate", "Moderate"],
              ["busy", "Busy"],
              ["full", "Full"],
            ]}
          />
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              checked={draft.dot}
              onChange={(event) =>
                setDraft({ ...draft, dot: event.target.checked })
              }
              type="checkbox"
            />
            DOT accredited
          </label>

          {show("amenities") ? (
            <CountedFieldset
              counts={facets?.amenities}
              label="Amenities"
              options={profile.amenities}
              selected={draft.amenities}
              onToggle={(value, checked) =>
                setDraft({
                  ...draft,
                  amenities: checked
                    ? [...draft.amenities, value]
                    : draft.amenities.filter((item) => item !== value),
                })
              }
            />
          ) : null}

          {show("route") ? (
            <fieldset className="sm:col-span-2 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Route</legend>
              {!hasOrigin ? (
                <p className="text-sm text-muted-foreground">
                  Use Locate on the map to set a private origin, then apply
                  travel limits. Route ceilings are never stored in the URL.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    {unknownDataRule("route")}
                  </p>
                  <FilterInput
                    label="Max travel time (minutes)"
                    min="1"
                    type="number"
                    value={draft.maxDurationMin}
                    onChange={(value) =>
                      setDraft({ ...draft, maxDurationMin: value })
                    }
                  />
                  <FilterInput
                    label="Max fare (PHP)"
                    min="0"
                    type="number"
                    value={draft.maxFare}
                    onChange={(value) =>
                      setDraft({ ...draft, maxFare: value })
                    }
                  />
                  <FilterInput
                    label="Max walking (meters)"
                    min="0"
                    type="number"
                    value={draft.maxWalkingM}
                    onChange={(value) =>
                      setDraft({ ...draft, maxWalkingM: value })
                    }
                  />
                  <FilterInput
                    label="Max transfers"
                    min="0"
                    type="number"
                    value={draft.maxTransfers}
                    onChange={(value) =>
                      setDraft({ ...draft, maxTransfers: value })
                    }
                  />
                  <label className="flex min-h-11 items-center gap-2 text-sm font-medium sm:col-span-2">
                    <input
                      checked={draft.routeRequired}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          routeRequired: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    Require a modeled route estimate
                  </label>
                  <CountedFieldset
                    label="Allowed modes only"
                    options={[
                      { value: "jeepney", label: "Jeepney" },
                      { value: "bus", label: "Bus" },
                      { value: "ferry", label: "Ferry" },
                      { value: "tricycle", label: "Tricycle" },
                      { value: "multicab", label: "Multicab" },
                      { value: "habal_habal", label: "Habal-habal" },
                    ]}
                    selected={draft.modes}
                    onToggle={(value, checked) =>
                      setDraft({
                        ...draft,
                        modes: checked
                          ? [...draft.modes, value]
                          : draft.modes.filter((item) => item !== value),
                      })
                    }
                  />
                </div>
              )}
            </fieldset>
          ) : null}

          {confirmClear && orphans.length ? (
            <p className={styles.filterNotice} role="alert">
              These filters no longer apply to {profile.label}:{" "}
              {orphans.join(", ")}. Apply again to clear them, or change
              category to keep them.
            </p>
          ) : null}
        </div>
        <div className={styles.filterFooter}>
          <Button className={styles.filterApply} type="submit">
            <Check aria-hidden="true" className="h-4 w-4" />
            {confirmClear && orphans.length
              ? "Clear invalid filters and apply"
              : draftChanged
                ? "Apply filters"
                : `Show ${resultCount} ${resultCount === 1 ? "place" : "places"}`}
          </Button>
          <Button
            className={styles.filterReset}
            onClick={() => {
              setConfirmClear(false);
              setDraft(emptyDraft());
            }}
            type="button"
            variant="secondary"
          >
            Reset
          </Button>
        </div>
      </form>
    </dialog>
  );

  function show(control: Parameters<typeof unknownDataRule>[0]) {
    return profile.controls.has(control);
  }
}

function CountedFieldset({
  label,
  options,
  selected,
  counts,
  onToggle,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  counts?: Array<{ value: string; count: number }>;
  onToggle: (value: string, checked: boolean) => void;
}) {
  const countMap = new Map((counts ?? []).map((item) => [item.value, item.count]));
  return (
    <fieldset className={styles.filterSection}>
      <legend className={styles.filterSectionTitle}>{label}</legend>
      <div className={styles.filterChipRow}>
        {options.map((option) => {
          const count = countMap.get(option.value);
          const impossible = count === 0;
          const active = selected.includes(option.value);
          return (
            <label
              className={cn(styles.filterChip, active && styles.filterChipActive)}
              key={option.value}
              title={
                impossible
                  ? "No current results include this option"
                  : undefined
              }
            >
              <input
                checked={active}
                disabled={impossible && !active}
                onChange={(event) => onToggle(option.value, event.target.checked)}
                type="checkbox"
                value={option.value}
              />
              {option.label}
              {count !== undefined ? (
                <span className={styles.filterChipCount}>{count}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ToggleChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(styles.filterChip, checked && styles.filterChipActive)}
    >
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function FilterInput({
  label,
  hint,
  value,
  onChange,
  type = "text",
  min,
  max,
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}) {
  const id = `filter-${label.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <label className={styles.filterField} htmlFor={id}>
      <span className={styles.filterFieldLabel}>{label}</span>
      <input
        className={styles.filterInput}
        id={id}
        max={max}
        min={min}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        type={type}
        value={value}
      />
      {hint ? <span className={styles.filterFieldHint}>{hint}</span> : null}
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className={styles.filterField}>
      <span className={styles.filterFieldLabel}>{label}</span>
      <MenuSelect
        ariaLabel={label}
        onChange={onChange}
        options={options.map(([optionValue, name]) => ({
          value: optionValue,
          label: name,
        }))}
        value={value}
        variant="field"
      />
    </div>
  );
}

function filterDraft(params: URLSearchParams, route: SessionRouteDraft) {
  const attributes = params.getAll("attr");
  return {
    area: params.get("location") ?? params.get("area") ?? "",
    checkIn: params.get("checkIn") ?? "",
    checkOut: params.get("checkOut") ?? "",
    pax: params.get("pax") ?? "",
    rooms: params.get("requestedUnits") ?? params.get("rooms") ?? "",
    minTotal: params.get("minTotal") ?? params.get("minPrice") ?? "",
    maxTotal: params.get("maxTotal") ?? params.get("maxPrice") ?? "",
    amenities: params.getAll("amenity"),
    rateTypes: params.getAll("rateType"),
    cancellations: params.getAll("cancellation"),
    cuisines: attributes
      .filter((value) => value.startsWith("cuisine:"))
      .map((value) => value.slice("cuisine:".length)),
    dayUse: attributes.includes("day_use:true"),
    overnight: attributes.includes("overnight:true"),
    durationHours:
      attributes
        .find((value) => value.startsWith("duration_hours:"))
        ?.split(":")[1] ?? "",
    visitDate: params.get("visitDate") ?? "",
    visitTime: params.get("visitTime") ?? "",
    available: params.get("available") === "1",
    rating: params.get("rating") ?? "",
    bookingMode: params.get("bookingMode") ?? "",
    crowd: params.get("crowd") ?? "",
    dot: params.get("dot") === "1",
    maxDurationMin: route.maxDurationMin,
    maxFare: route.maxFare,
    maxWalkingM: route.maxWalkingM,
    maxTransfers: route.maxTransfers,
    modes: route.modes,
    routeRequired: route.required,
  };
}

function emptyDraft() {
  return {
    area: "",
    checkIn: "",
    checkOut: "",
    pax: "",
    rooms: "",
    minTotal: "",
    maxTotal: "",
    amenities: [] as string[],
    rateTypes: [] as string[],
    cancellations: [] as string[],
    cuisines: [] as string[],
    dayUse: false,
    overnight: false,
    durationHours: "",
    visitDate: "",
    visitTime: "",
    available: false,
    rating: "",
    bookingMode: "",
    crowd: "",
    dot: false,
    maxDurationMin: "",
    maxFare: "",
    maxWalkingM: "",
    maxTransfers: "",
    modes: [] as string[],
    routeRequired: false,
  };
}

function draftAttributes(draft: ReturnType<typeof filterDraft>) {
  const attributes: NonNullable<SearchQuery["attributes"]> = [];
  if (draft.dayUse) attributes.push({ key: "day_use", value: true });
  if (draft.overnight) attributes.push({ key: "overnight", value: true });
  draft.cuisines.forEach((value) =>
    attributes.push({ key: "cuisine", value }),
  );
  if (draft.durationHours)
    attributes.push({
      key: "duration_hours",
      value: Number(draft.durationHours),
    });
  return attributes;
}

export function emptyRouteDraft(): SessionRouteDraft {
  return {
    maxDurationMin: "",
    maxFare: "",
    maxWalkingM: "",
    maxTransfers: "",
    modes: [],
    required: false,
  };
}

export function routeFromDraft(
  draft: SessionRouteDraft | null,
): SearchQuery["route"] | undefined {
  if (!draft) return undefined;
  const route: NonNullable<SearchQuery["route"]> = {};
  if (draft.maxDurationMin)
    route.maxDurationMin = Number(draft.maxDurationMin);
  if (draft.maxFare) route.maxFare = Math.round(Number(draft.maxFare) * 100);
  if (draft.maxWalkingM) route.maxWalkingM = Number(draft.maxWalkingM);
  if (draft.maxTransfers) route.maxTransfers = Number(draft.maxTransfers);
  if (draft.modes.length)
    route.modes = draft.modes as NonNullable<SearchQuery["route"]>["modes"];
  if (draft.required) route.required = true;
  return Object.keys(route).length ? route : undefined;
}

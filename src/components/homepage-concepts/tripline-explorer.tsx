"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";

import type { DiscoveryListing } from "@/modules/listings/search";

type AreaFilter = "all" | "davao-city" | "samal";
type CategoryFilter = DiscoveryListing["category"] | "all";
type BudgetFilter = "all" | "1000" | "2500" | "5000";

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "resort", label: "Resorts" },
  { value: "room", label: "Rooms & stays" },
  { value: "restaurant", label: "Food & drink" },
  { value: "activity", label: "Activities" },
  { value: "service", label: "Services" },
];

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatConceptPrice(price: number | null) {
  return price ? pesoFormatter.format(price / 100) : "Ask for rates";
}

const CATEGORY_LABELS: Record<DiscoveryListing["category"], string> = {
  resort: "Resort",
  room: "Room & stay",
  restaurant: "Food & drink",
  activity: "Activity",
  service: "Service",
};

const BUDGET_OPTIONS: { value: BudgetFilter; label: string }[] = [
  { value: "all", label: "Any budget" },
  { value: "1000", label: "Up to ₱1,000" },
  { value: "2500", label: "Up to ₱2,500" },
  { value: "5000", label: "Up to ₱5,000" },
];

export function TriplineExplorer({
  listings,
}: {
  listings: DiscoveryListing[];
}) {
  const [area, setArea] = useState<AreaFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [budget, setBudget] = useState<BudgetFilter>("all");
  const [selectedId, setSelectedId] = useState(listings[0]?.id ?? "");

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const areaMatches = area === "all" || getListingArea(listing) === area;
        const categoryMatches =
          category === "all" || listing.category === category;
        const budgetMatches =
          budget === "all" ||
          (listing.priceMin !== null &&
            listing.priceMin <= Number(budget) * 100);

        return areaMatches && categoryMatches && budgetMatches;
      }),
    [area, budget, category, listings],
  );

  const selectedListing =
    filteredListings.find((listing) => listing.id === selectedId) ??
    filteredListings[0] ??
    null;

  const searchHref = useMemo(() => {
    const params = new URLSearchParams();
    if (area !== "all") params.set("area", area);
    if (category !== "all") params.set("category", category);
    if (budget !== "all") params.set("maxPrice", budget);
    const query = params.toString();
    return query ? `/search?${query}` : "/search";
  }, [area, budget, category]);

  function resetFilters() {
    setArea("all");
    setCategory("all");
    setBudget("all");
    setSelectedId(listings[0]?.id ?? "");
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#111827]/12 bg-white shadow-[0_28px_80px_rgba(17,24,39,0.10)]">
      <div className="flex flex-col gap-4 border-b border-[#111827]/10 bg-[#F9FAFF] px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#5145C7] [font-family:var(--font-tripline-mono)]">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Explorer controls
          </p>
          <p
            aria-live="polite"
            className="mt-2 text-sm font-semibold text-[#111827]"
          >
            {filteredListings.length}{" "}
            {filteredListings.length === 1 ? "place" : "places"} match
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:w-[35rem]">
          <label className="grid gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#4B5563] [font-family:var(--font-tripline-mono)]">
            Area
            <select
              className="min-h-11 rounded-xl border border-[#111827]/15 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus-visible:border-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB]/30 motion-reduce:transition-none"
              onChange={(event) => {
                setArea(event.target.value as AreaFilter);
                setSelectedId("");
              }}
              value={area}
            >
              <option value="all">Everywhere</option>
              <option value="davao-city">Davao City</option>
              <option value="samal">Samal Island</option>
            </select>
          </label>
          <label className="grid gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#4B5563] [font-family:var(--font-tripline-mono)]">
            Category
            <select
              className="min-h-11 rounded-xl border border-[#111827]/15 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus-visible:border-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB]/30 motion-reduce:transition-none"
              onChange={(event) => {
                setCategory(event.target.value as CategoryFilter);
                setSelectedId("");
              }}
              value={category}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#4B5563] [font-family:var(--font-tripline-mono)]">
            Budget
            <select
              className="min-h-11 rounded-xl border border-[#111827]/15 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus-visible:border-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB]/30 motion-reduce:transition-none"
              onChange={(event) => {
                setBudget(event.target.value as BudgetFilter);
                setSelectedId("");
              }}
              value={budget}
            >
              {BUDGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selectedListing ? (
        <div className="grid min-h-[27rem] lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
          <div className="border-b border-[#111827]/10 bg-[#F9FAFF] p-3 lg:border-b-0 lg:border-r">
            <div
              aria-label="Matching places"
              className="grid max-h-[31rem] gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:#6D5DFB_transparent]"
              role="listbox"
            >
              {filteredListings.map((listing, index) => {
                const isSelected = selectedListing.id === listing.id;
                return (
                  <button
                    aria-selected={isSelected}
                    className="group grid min-h-[4.75rem] w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-2 text-left outline-none transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none data-[active=true]:border-[#6D5DFB] data-[active=true]:bg-[#EEF2FF] data-[active=true]:shadow-[0_10px_28px_rgba(109,93,251,0.12)]"
                    data-active={isSelected}
                    key={listing.id}
                    onClick={() => setSelectedId(listing.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(listing.id);
                        return;
                      }

                      if (
                        event.key !== "ArrowDown" &&
                        event.key !== "ArrowUp" &&
                        event.key !== "Home" &&
                        event.key !== "End"
                      ) {
                        return;
                      }

                      event.preventDefault();
                      const options = Array.from(
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="option"]',
                        ) ?? [],
                      );
                      const currentIndex = options.indexOf(event.currentTarget);
                      const nextIndex =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? options.length - 1
                            : event.key === "ArrowDown"
                              ? (currentIndex + 1) % options.length
                              : (currentIndex - 1 + options.length) %
                                options.length;
                      const nextOption = options[nextIndex];

                      nextOption?.focus();
                      setSelectedId(
                        filteredListings[nextIndex]?.id ?? listing.id,
                      );
                    }}
                    role="option"
                    tabIndex={isSelected ? 0 : -1}
                    type="button"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-xs font-semibold text-white [font-family:var(--font-tripline-mono)] group-data-[active=true]:bg-[#6D5DFB]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#111827]">
                        {listing.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[#6B7280]">
                        {CATEGORY_LABELS[listing.category]} ·{" "}
                        {formatAddress(listing)}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#111827] [font-family:var(--font-tripline-mono)]">
                      {shortPrice(listing.priceMin)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <article className="grid min-w-0 bg-white sm:grid-cols-[minmax(0,0.92fr)_minmax(16rem,1.08fr)]">
            <div className="relative min-h-[18rem] overflow-hidden bg-[#111827] sm:min-h-full">
              <Image
                alt={
                  selectedListing.media[0]?.caption ??
                  fallbackImageAlt(selectedListing)
                }
                className="object-cover transition-transform duration-500 motion-reduce:transition-none"
                fill
                loading="eager"
                sizes="(min-width: 1024px) 27vw, (min-width: 640px) 48vw, 100vw"
                src={
                  selectedListing.media[0]?.url ??
                  fallbackImage(selectedListing)
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/70 via-transparent to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-[#A7F3D0] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[#111827] [font-family:var(--font-tripline-mono)]">
                Live selection
              </span>
              <p className="absolute bottom-4 left-4 right-4 text-xs leading-5 text-white/80">
                {selectedListing.media[0]?.caption ??
                  "A local discovery from the current Pasadya guide."}
              </p>
            </div>

            <div className="flex min-w-0 flex-col p-5 sm:p-6 lg:p-7">
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.13em] [font-family:var(--font-tripline-mono)]">
                <span className="rounded-full bg-[#EEF2FF] px-3 py-2 text-[#5446CE]">
                  {CATEGORY_LABELS[selectedListing.category]}
                </span>
                {selectedListing.dotAccredited ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6FFF2] px-3 py-2 text-[#166534]">
                    <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    DOT accredited
                  </span>
                ) : null}
              </div>

              <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#111827] sm:text-3xl">
                {selectedListing.name}
              </h2>
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#4B5563]">
                <MapPin
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-[#6D5DFB]"
                />
                {formatAddress(selectedListing)}
              </p>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#4B5563]">
                {selectedListing.description}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-[#111827]/10 py-5 text-sm">
                <div>
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#6B7280] [font-family:var(--font-tripline-mono)]">
                    From
                  </dt>
                  <dd className="mt-1 font-semibold text-[#111827]">
                    {formatConceptPrice(selectedListing.priceMin)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#6B7280] [font-family:var(--font-tripline-mono)]">
                    Rating
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1 font-semibold text-[#111827]">
                    <Star
                      aria-hidden="true"
                      className="h-4 w-4 fill-[#FF7A45] text-[#FF7A45]"
                    />
                    {selectedListing.ratingAvg.toFixed(1)}
                    <span className="font-normal text-[#6B7280]">
                      ({selectedListing.ratingCount})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#6B7280] [font-family:var(--font-tripline-mono)]">
                    Crowd signal
                  </dt>
                  <dd className="mt-1 font-semibold capitalize text-[#111827]">
                    {String(
                      selectedListing.attributes.crowd_level ?? "moderate",
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#6B7280] [font-family:var(--font-tripline-mono)]">
                    Price mode
                  </dt>
                  <dd className="mt-1 font-semibold text-[#111827]">
                    {selectedListing.priceMin === null
                      ? "Confirm directly"
                      : "Guide price"}
                  </dd>
                </div>
              </dl>

              <Link
                className="mt-auto inline-flex min-h-12 items-center justify-between gap-3 rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white outline-none transition hover:bg-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-2 motion-reduce:transition-none"
                href={`/place/${selectedListing.slug}`}
              >
                Open place profile
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      ) : (
        <div className="grid min-h-[27rem] place-items-center bg-[radial-gradient(circle_at_50%_30%,#EEF2FF,white_64%)] px-5 py-14 text-center">
          <div className="max-w-md">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#6D5DFB]">
              <Search aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">
              No places match this mix yet.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Widen the budget or reset the filters to return to the complete
              current guide.
            </p>
            <button
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white outline-none transition hover:bg-[#6D5DFB] focus-visible:ring-2 focus-visible:ring-[#6D5DFB] focus-visible:ring-offset-2 motion-reduce:transition-none"
              onClick={resetFilters}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset filters
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[#111827]/10 bg-[#111827] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs leading-5 text-white/65">
          Filters mirror the complete search. Prices are guide amounts and may
          change.
        </p>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#A7F3D0] px-4 text-sm font-semibold text-[#111827] outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] motion-reduce:transition-none"
          href={searchHref}
        >
          View this search
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function getListingArea(listing: DiscoveryListing): AreaFilter {
  const municipality = listing.address.municipality?.toLowerCase() ?? "";
  return municipality.includes("davao") ? "davao-city" : "samal";
}

function formatAddress(listing: DiscoveryListing) {
  return (
    [
      listing.address.barangay,
      listing.address.municipality,
      listing.address.province,
    ]
      .filter(Boolean)
      .join(", ") || "Davao City + Samal Island"
  );
}

function shortPrice(price: number | null) {
  if (price === null) return "Ask";
  return `₱${Math.round(price / 100).toLocaleString("en-PH")}`;
}

function fallbackImage(listing: DiscoveryListing) {
  return getListingArea(listing) === "samal"
    ? "/homepage-concepts/shared-photography/samal-shore-desktop.webp"
    : "/homepage-concepts/shared-photography/davao-sunset-desktop.webp";
}

function fallbackImageAlt(listing: DiscoveryListing) {
  return getListingArea(listing) === "samal"
    ? "Palm-lined shore on Samal Island"
    : "Davao City skyline at sunset";
}

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  amenityOptions,
  areaOptions,
  categoryLabels,
  type SearchFilters,
} from "@/modules/listings/discovery";

export function SearchControls({
  filters,
  compact = false,
}: {
  filters: SearchFilters;
  compact?: boolean;
}) {
  return (
    <form
      action="/search"
      className={
        compact
          ? "grid gap-3 rounded-md border bg-card p-3 shadow-sm md:grid-cols-[1fr_160px_auto]"
          : "space-y-5"
      }
    >
      <label className="grid gap-1 text-sm font-medium">
        Search
        <input
          className="min-h-11 rounded-sm border bg-background px-3 text-base font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={filters.q}
          name="q"
          placeholder="Resorts, food, rooms..."
          type="search"
        />
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Area
        <select
          className="min-h-11 rounded-sm border bg-background px-3 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={filters.area ?? ""}
          name="area"
        >
          <option value="">All areas</option>
          {Object.entries(areaOptions).map(([slug, area]) => (
            <option key={slug} value={slug}>
              {area.label}
            </option>
          ))}
        </select>
      </label>

      {compact ? (
        <Button className="self-end" type="submit">
          Search
        </Button>
      ) : null}

      {!compact ? (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Category</legend>
            <div className="grid gap-2">
              <label className="flex min-h-11 items-center gap-2 rounded-sm border bg-background px-3 text-sm">
                <input
                  defaultChecked={!filters.category}
                  name="category"
                  type="radio"
                  value=""
                />
                All categories
              </label>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <label
                  className="flex min-h-11 items-center gap-2 rounded-sm border bg-background px-3 text-sm"
                  key={value}
                >
                  <input
                    defaultChecked={filters.category === value}
                    name="category"
                    type="radio"
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Amenities</legend>
            <div className="grid gap-2">
              {amenityOptions.map((amenity) => (
                <label
                  className="flex min-h-11 items-center gap-2 rounded-sm border bg-background px-3 text-sm"
                  key={amenity.slug}
                >
                  <input
                    defaultChecked={filters.amenities?.includes(amenity.slug)}
                    name="amenity"
                    type="checkbox"
                    value={amenity.slug}
                  />
                  {amenity.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Max price
              <select
                className="min-h-11 rounded-sm border bg-background px-3 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={
                  filters.maxPrice ? String(filters.maxPrice / 100) : ""
                }
                name="maxPrice"
              >
                <option value="">Any budget</option>
                <option value="200">Under PHP 200</option>
                <option value="500">Under PHP 500</option>
                <option value="1500">Under PHP 1,500</option>
                <option value="3000">Under PHP 3,000</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Rating
              <select
                className="min-h-11 rounded-sm border bg-background px-3 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={filters.minRating ?? ""}
                name="rating"
              >
                <option value="">Any rating</option>
                <option value="4.5">4.5+</option>
                <option value="4">4.0+</option>
                <option value="3">3.0+</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Booking
              <select
                className="min-h-11 rounded-sm border bg-background px-3 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={filters.bookingMode ?? ""}
                name="bookingMode"
              >
                <option value="">Any booking type</option>
                <option value="instant">Instant book</option>
                <option value="inquiry">Inquiry</option>
                <option value="none">Contact only</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Crowd
              <select
                className="min-h-11 rounded-sm border bg-background px-3 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={filters.crowd ?? ""}
                name="crowd"
              >
                <option value="">Any crowd level</option>
                <option value="quiet">Quiet</option>
                <option value="moderate">Moderate</option>
                <option value="busy">Busy</option>
              </select>
            </label>

            <label className="flex min-h-11 items-center gap-2 rounded-sm border bg-background px-3 text-sm font-medium">
              <input
                defaultChecked={filters.dotAccredited}
                name="dot"
                type="checkbox"
                value="1"
              />
              DOT accredited
            </label>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" type="submit">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              Apply filters
            </Button>
            <Button asChild variant="secondary">
              <Link href="/search">Reset</Link>
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}

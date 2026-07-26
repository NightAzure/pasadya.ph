import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LocationConfirmation } from "@/components/portal/location-confirmation";
import { OwnerListingForm } from "@/components/portal/owner-listing-form";
import { OwnerListingSubmit } from "@/components/portal/owner-listing-submit";
import { StructuredListingDetails } from "@/components/portal/structured-listing-details";
import { QuotePanel } from "@/components/pricing/quote-panel";
import {
  getAllAmenities,
  getOwnerListing,
  getPortalActor,
} from "@/modules/portal/service";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getPortalActor();
  const { listingId } = await params;
  const listing = await getOwnerListing(actor.id, listingId);
  const amenities = await getAllAmenities();
  const pageParams = (await searchParams) ?? {};

  if (!listing) {
    notFound();
  }

  const selectedAmenities = new Set(listing.amenities.map((item) => item.slug));
  const primaryRate = listing.ratePlans[0];
  const locationWithinLaunchBounds =
    listing.location !== null &&
    listing.location.latitude >= 6.9 &&
    listing.location.latitude <= 7.566667 &&
    listing.location.longitude >= 125.233333 &&
    listing.location.longitude <= 125.791111;
  const rateComplete = Boolean(
    primaryRate &&
    primaryRate.billingPeriod &&
    primaryRate.billingUnit &&
    primaryRate.capacityPerUnit &&
    primaryRate.inventoryUnitLabel &&
    primaryRate.availableQuantity !== null &&
    primaryRate.minPax !== null &&
    primaryRate.maxPax !== null &&
    primaryRate.includedPax !== null,
  );

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Owner listing edit</p>
          <h1 className="text-2xl font-semibold">{listing.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Update basics, amenities, rates, contact info, and photo metadata.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/portal">Back to portal</Link>
        </Button>
      </div>

      {pageParams.saved ? (
        <div
          className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium"
          role="status"
        >
          Listing updates saved.
        </div>
      ) : null}

      <OwnerListingForm>
        <input name="listingId" type="hidden" value={listing.id} />

        <Section title="Basics">
          <div className="grid gap-4">
            <Field
              defaultValue={listing.name}
              label="Name"
              name="name"
              required
            />
            <label className="block">
              <span className="text-sm font-medium">Description</span>
              <textarea
                className="mt-2 min-h-36 w-full rounded-sm border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                defaultValue={listing.description ?? ""}
                name="description"
                required
              />
            </label>
          </div>
        </Section>

        <Section title="Location and contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              defaultValue={listing.address.street ?? ""}
              label="Street"
              name="street"
            />
            <Field
              defaultValue={listing.address.barangay ?? ""}
              label="Barangay"
              name="barangay"
              required
            />
            <Field
              defaultValue={listing.address.municipality ?? ""}
              label="City / municipality"
              name="municipality"
              required
            />
            <Field
              defaultValue={listing.address.province ?? ""}
              label="Province"
              name="province"
              required
            />
            <Field
              defaultValue={listing.contactPhone ?? ""}
              label="Phone"
              name="contactPhone"
              type="tel"
            />
            <Field
              defaultValue={listing.contactFacebook ?? ""}
              label="Facebook"
              name="contactFacebook"
            />
            <Field
              defaultValue={listing.contactWebsite ?? ""}
              label="Website"
              name="contactWebsite"
              type="url"
            />
          </div>
          <div className="mt-4">
            <LocationConfirmation
              address={[
                listing.address.street,
                listing.address.barangay,
                listing.address.municipality,
                listing.address.province,
              ]
                .filter(Boolean)
                .join(", ")}
              initial={listing.location}
            />
          </div>
        </Section>

        <Section title="Amenities">
          <div className="grid gap-2 sm:grid-cols-2">
            {amenities.map((amenity) => (
              <label
                className="flex min-h-12 items-center gap-3 rounded-sm border bg-background px-3 text-sm"
                key={amenity.slug}
              >
                <input
                  defaultChecked={selectedAmenities.has(amenity.slug)}
                  name="amenitySlugs"
                  type="checkbox"
                  value={amenity.slug}
                />
                {amenity.name}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Primary rate">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              defaultValue={primaryRate?.name ?? "Standard package"}
              label="Rate name"
              name="rateName"
              required
            />
            <label className="block">
              <span className="text-sm font-medium">Rate type</span>
              <select
                className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                defaultValue={primaryRate?.type ?? "package"}
                name="rateType"
              >
                <option value="entrance">Entrance</option>
                <option value="day_use">Day use</option>
                <option value="overnight">Overnight</option>
                <option value="package">Package</option>
                <option value="hourly">Hourly</option>
              </select>
            </label>
            <Field
              defaultValue={
                primaryRate?.price ? String(primaryRate.price / 100) : ""
              }
              label="Price in PHP"
              name="ratePricePhp"
              required
              type="number"
            />
            <label className="block">
              <span className="text-sm font-medium">Price unit</span>
              <select
                className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                defaultValue={primaryRate?.priceUnit ?? "flat"}
                name="rateUnit"
              >
                <option value="per_person">Per person</option>
                <option value="per_group">Per group</option>
                <option value="per_night">Per night</option>
                <option value="flat">Flat</option>
              </select>
            </label>
            <Field
              defaultValue={primaryRate?.description ?? ""}
              label="Rate description"
              name="rateDescription"
            />
            <label className="block">
              <span className="text-sm font-medium">Billing period</span>
              <select
                className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                defaultValue={primaryRate?.billingPeriod ?? "once"}
                name="billingPeriod"
              >
                <option value="once">Once</option>
                <option value="night">Per night</option>
                <option value="day">Per day</option>
                <option value="hour">Per hour</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Billing unit</span>
              <select
                className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                defaultValue={primaryRate?.billingUnit ?? "group"}
                name="billingUnit"
              >
                <option value="inventory_unit">Inventory unit</option>
                <option value="person">Person</option>
                <option value="group">Group</option>
              </select>
            </label>
            <Field
              defaultValue={String(
                primaryRate?.includedPax ?? primaryRate?.minPax ?? 1,
              )}
              label="Included guests"
              name="includedPax"
              required
              type="number"
            />
            <Field
              defaultValue={String((primaryRate?.extraPaxCharge ?? 0) / 100)}
              label="Extra guest charge (PHP)"
              name="extraPaxChargePhp"
              required
              type="number"
            />
            <Field
              defaultValue={String(
                primaryRate?.capacityPerUnit ?? primaryRate?.maxPax ?? 1,
              )}
              label="Capacity per unit"
              name="capacityPerUnit"
              required
              type="number"
            />
            <Field
              defaultValue={
                primaryRate?.inventoryUnitLabel ??
                "room, cottage, table, or package"
              }
              label="Inventory-unit label"
              name="inventoryUnitLabel"
              required
            />
            <Field
              defaultValue={String(primaryRate?.minPax ?? 1)}
              label="Minimum guests"
              name="minPax"
              required
              type="number"
            />
            <Field
              defaultValue={String(
                primaryRate?.maxPax ?? primaryRate?.minPax ?? 1,
              )}
              label="Maximum guests"
              name="maxPax"
              required
              type="number"
            />
            <Field
              defaultValue={String(primaryRate?.availableQuantity ?? 0)}
              label="Available quantity"
              name="availableQuantity"
              required
              type="number"
            />
            <Field
              defaultValue={String((primaryRate?.mandatoryFee ?? 0) / 100)}
              label="One fixed per-booking mandatory fee (PHP)"
              name="mandatoryFeePhp"
              required
              type="number"
            />
            <Field
              defaultValue={primaryRate?.mandatoryFeeLabel ?? ""}
              label="Fixed per-booking fee name"
              name="mandatoryFeeLabel"
              placeholder="e.g. environmental fee"
            />
          </div>
          <label className="mt-4 flex min-h-12 items-center gap-3 rounded-sm border bg-background px-3 text-sm">
            <input
              defaultChecked
              name="feeDisclosureConfirmed"
              required
              type="checkbox"
              value="true"
            />
            I confirm this rate has no mandatory charges beyond this one fixed
            per-booking fee (use PHP 0 when none apply). Per-person, per-night,
            percentage, and inclusive taxes need team review.
          </label>
          <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-muted-foreground">
            Price declaration:{" "}
            {primaryRate?.price
              ? `Starting at ₱${(primaryRate.price / 100).toLocaleString("en-PH")}`
              : "No starting price yet"}
            , {primaryRate?.billingPeriod ?? "unknown"} /{" "}
            {primaryRate?.billingUnit ?? "unknown"}. Capacity and availability
            is owner-provided. Use the quote preview below for an exact total;
            only fresh team-verified data can later earn a Verified total label.
          </p>
        </Section>

        <StructuredListingDetails
          category={listing.category}
          attributes={listing.attributes}
          special={listing.specialHours}
          weekly={listing.weeklyHours}
        />

        <Section title="Search-data completeness">
          <ul className="grid gap-2 text-sm">
            <li
              className={
                locationWithinLaunchBounds ? "text-success" : "text-warning"
              }
            >
              {locationWithinLaunchBounds ? "Complete" : "Needs attention"}:
              confirmed launch-area location for map and area filters.
            </li>
            <li className={rateComplete ? "text-success" : "text-warning"}>
              {rateComplete ? "Complete" : "Needs attention"}: capacity before
              guest-capacity filters can include this listing.
            </li>
            <li
              className={
                listing.weeklyHours.length ? "text-success" : "text-warning"
              }
            >
              {listing.weeklyHours.length ? "Complete" : "Needs attention"}:
              hours before open-now filters can include this listing.
            </li>
            <li className="text-warning">
              Route trust is currently unknown until the transport team verifies
              a nearby stop.
            </li>
          </ul>
        </Section>

        {listing.ratePlans.length ? (
          <QuotePanel
            listingId={listing.id}
            rates={listing.ratePlans.map((rate) => ({
              id: rate.id,
              name: rate.name,
              billingPeriod: rate.billingPeriod,
            }))}
            title="Owner quote preview"
          />
        ) : null}

        <Section title="Photo upload">
          <p className="text-sm leading-6 text-muted-foreground">
            Add an already-hosted development image URL and metadata. The
            metadata fields prove type/size validation before real signed R2
            uploads are wired. File name, content type, and size are required
            when adding a photo URL.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Photo URL" name="photoUrl" />
            <Field label="File name" name="photoFileName" />
            <Field
              label="Content type"
              name="photoContentType"
              placeholder="image/jpeg"
            />
            <Field label="Size bytes" name="photoSizeBytes" type="number" />
          </div>
        </Section>

        <OwnerListingSubmit />
      </OwnerListingForm>
    </main>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

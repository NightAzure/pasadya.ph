import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { updateOwnerListingAction } from "@/modules/portal/actions";
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

      <form
        action={updateOwnerListingAction}
        className="space-y-5 rounded-md border bg-card p-4 shadow-sm sm:p-5"
      >
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
          </div>
        </Section>

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

        <Button className="w-full" size="lg" type="submit">
          Save listing
        </Button>
      </form>
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

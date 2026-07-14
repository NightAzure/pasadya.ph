import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileCheck2, Mail, MessageSquareText, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatAddress } from "@/modules/listings/search";
import { submitClaimAction } from "@/modules/portal/actions";
import { getListingForClaim, getPortalActor } from "@/modules/portal/service";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getPortalActor();
  const params = (await searchParams) ?? {};
  const listingSlug = Array.isArray(params.listing)
    ? params.listing[0]
    : params.listing;

  if (!listingSlug) {
    notFound();
  }

  const listing = await getListingForClaim(listingSlug);
  if (!listing) {
    notFound();
  }

  const isTransfer = listing.claimStatus === "claimed";

  return (
    <main
      className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <div className="mb-5">
        <Button asChild variant="ghost">
          <Link href={`/place/${listing.slug}`}>Back to listing</Link>
        </Button>
      </div>

      <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm font-medium text-primary">
          {isTransfer ? "Ownership transfer" : "Claim this business"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{listing.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatAddress(listing.address)}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isTransfer
            ? "This listing already has a verified owner. Your request will go to the moderation queue for arbitration."
            : "Choose an instant phone or email check for local development, or submit a document/photo path for admin review."}
        </p>
      </section>

      <form
        action={submitClaimAction}
        className="mt-5 space-y-5 rounded-md border bg-card p-4 shadow-sm sm:p-5"
      >
        <input name="listingSlug" type="hidden" value={listing.slug} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            autoComplete="name"
            label="Your name"
            name="claimantName"
            required
            type="text"
          />
          <Field
            autoComplete="tel"
            inputMode="tel"
            label="Phone number"
            name="contactPhone"
            placeholder={listing.contactPhone ?? "+63"}
            required
            type="tel"
          />
          <Field
            autoComplete="email"
            label="Email"
            name="contactEmail"
            required
            spellCheck={false}
            type="email"
          />
          <Field
            label="Dev OTP code"
            name="otpCode"
            placeholder="Any code in local dev"
            type="text"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold">
            Verification method
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <MethodOption
              description="Auto-approves in local development for unclaimed listings."
              icon={<Smartphone aria-hidden="true" className="h-5 w-5" />}
              label="Phone OTP"
              value="phone_otp"
            />
            <MethodOption
              description="Auto-approves in local development for unclaimed listings."
              icon={<Mail aria-hidden="true" className="h-5 w-5" />}
              label="Listed email"
              value="email"
            />
            <MethodOption
              description="Adds DTI/SEC, permit, or utility bill evidence to admin review."
              icon={<FileCheck2 aria-hidden="true" className="h-5 w-5" />}
              label="Document"
              value="document"
            />
            <MethodOption
              description="Adds premise/signage photo evidence to admin review."
              icon={
                <MessageSquareText aria-hidden="true" className="h-5 w-5" />
              }
              label="Photo verification"
              value="photo_verification"
            />
          </div>
        </fieldset>

        <section className="space-y-3 rounded-md border bg-muted/40 p-3">
          <h2 className="text-base font-semibold">Upload metadata</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Local development validates file type and size only. Production will
            issue Cloudflare R2 signed URLs and strip EXIF GPS from images.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="File name" name="fileName" type="text" />
            <Field
              label="Content type"
              name="contentType"
              placeholder="application/pdf"
              type="text"
            />
            <Field
              label="Size bytes"
              name="sizeBytes"
              placeholder="204800"
              type="number"
            />
          </div>
        </section>

        <label className="block">
          <span className="text-sm font-medium">Notes for reviewer</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-sm border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            name="notes"
            placeholder="Tell us your role and any context that helps verify ownership."
          />
        </label>

        <Button className="w-full" size="lg" type="submit">
          {isTransfer ? "Request ownership transfer" : "Submit claim"}
        </Button>
      </form>
    </main>
  );
}

function Field({
  autoComplete,
  inputMode,
  label,
  name,
  type,
  placeholder,
  required,
  spellCheck,
}: {
  autoComplete?: string;
  inputMode?: "email" | "numeric" | "tel" | "text";
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  spellCheck?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        autoComplete={autoComplete}
        inputMode={inputMode}
        name={name}
        placeholder={placeholder}
        required={required}
        spellCheck={spellCheck}
        type={type}
      />
    </label>
  );
}

function MethodOption({
  description,
  icon,
  label,
  value,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <label className="flex min-h-28 cursor-pointer gap-3 rounded-md border bg-background p-3 text-sm focus-within:ring-2 focus-within:ring-ring">
      <input
        className="mt-1 h-5 w-5"
        defaultChecked={value === "phone_otp"}
        name="method"
        type="radio"
        value={value}
      />
      <span>
        <span className="flex items-center gap-2 font-semibold">
          {icon}
          {label}
        </span>
        <span className="mt-1 block leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

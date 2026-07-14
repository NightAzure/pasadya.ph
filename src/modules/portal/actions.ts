"use server";

import { revalidatePath } from "next/cache";

import {
  approveClaim,
  getPortalActor,
  redirectAfterAction,
  rejectClaim,
  setAvailabilityBlock,
  setBusinessCrowd,
  submitClaim,
  updateOwnerListing,
} from "@/modules/portal/service";

export async function submitClaimAction(formData: FormData) {
  const actor = await getPortalActor();
  const result = await submitClaim(
    {
      listingSlug: String(formData.get("listingSlug") ?? ""),
      claimantName: String(formData.get("claimantName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      method: String(formData.get("method") ?? ""),
      otpCode: String(formData.get("otpCode") ?? ""),
      fileName: String(formData.get("fileName") ?? ""),
      contentType: String(formData.get("contentType") ?? ""),
      sizeBytes: Number(formData.get("sizeBytes") ?? 0),
      notes: String(formData.get("notes") ?? ""),
    },
    actor.id,
  );

  revalidatePath("/portal");
  revalidatePath("/admin");
  revalidatePath(`/place/${String(formData.get("listingSlug") ?? "")}`);
  redirectAfterAction(
    result.status === "approved"
      ? "/portal?claimed=1"
      : "/portal?claimSubmitted=1",
  );
}

export async function updateOwnerListingAction(formData: FormData) {
  const actor = await getPortalActor();
  const listingId = String(formData.get("listingId") ?? "");

  await updateOwnerListing(
    {
      listingId,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      street: String(formData.get("street") ?? ""),
      barangay: String(formData.get("barangay") ?? ""),
      municipality: String(formData.get("municipality") ?? ""),
      province: String(formData.get("province") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      contactFacebook: String(formData.get("contactFacebook") ?? ""),
      contactWebsite: String(formData.get("contactWebsite") ?? ""),
      amenitySlugs: formData.getAll("amenitySlugs").map(String),
      rateName: String(formData.get("rateName") ?? ""),
      rateType: String(formData.get("rateType") ?? "package"),
      ratePricePhp: Number(formData.get("ratePricePhp") ?? 0),
      rateUnit: String(formData.get("rateUnit") ?? "flat"),
      rateDescription: String(formData.get("rateDescription") ?? ""),
      photoUrl: String(formData.get("photoUrl") ?? ""),
      photoFileName: String(formData.get("photoFileName") ?? ""),
      photoContentType: String(formData.get("photoContentType") ?? ""),
      photoSizeBytes: Number(formData.get("photoSizeBytes") ?? 0),
    },
    actor.id,
  );

  revalidatePath("/portal");
  revalidatePath(`/portal/listings/${listingId}/edit`);
  redirectAfterAction(`/portal/listings/${listingId}/edit?saved=1`);
}

export async function setAvailabilityAction(formData: FormData) {
  const actor = await getPortalActor();
  const listingId = String(formData.get("listingId") ?? "");

  await setAvailabilityBlock(
    {
      listingId,
      date: String(formData.get("date") ?? ""),
      available: String(formData.get("available") ?? "false"),
      quantity: Number(formData.get("quantity") ?? 1),
    },
    actor.id,
  );

  revalidatePath("/portal");
  revalidatePath(`/portal/listings/${listingId}/availability`);
  redirectAfterAction(`/portal/listings/${listingId}/availability?saved=1`);
}

export async function setCrowdAction(formData: FormData) {
  const actor = await getPortalActor();
  const listingId = String(formData.get("listingId") ?? "");

  await setBusinessCrowd(
    {
      listingId,
      level: String(formData.get("level") ?? ""),
    },
    actor.id,
  );

  revalidatePath("/portal");
  redirectAfterAction("/portal?crowdUpdated=1");
}

export async function approveClaimAction(formData: FormData) {
  const actor = await getPortalActor({ minimumRole: "moderator" });
  const claimId = String(formData.get("claimId") ?? "");

  await approveClaim(claimId, actor.id);
  revalidatePath("/admin");
  revalidatePath("/portal");
  redirectAfterAction("/admin?claimApproved=1");
}

export async function rejectClaimAction(formData: FormData) {
  const actor = await getPortalActor({ minimumRole: "moderator" });
  const claimId = String(formData.get("claimId") ?? "");

  await rejectClaim(
    claimId,
    actor.id,
    String(formData.get("reviewerNotes") ?? "Rejected during moderation."),
  );
  revalidatePath("/admin");
  redirectAfterAction("/admin?claimRejected=1");
}

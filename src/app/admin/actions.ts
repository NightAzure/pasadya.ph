"use server";

import { revalidatePath } from "next/cache";

import {
  adminManageBooking,
  createAdminListing,
  getAdminActor,
  mergeAdminListings,
  resolveModerationItem,
  updateAdminListing,
} from "@/modules/admin";

export async function resolveModerationAction(formData: FormData) {
  const actor = await getAdminActor("moderator");
  const queueId = String(formData.get("queueId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const listingAction = String(formData.get("listingAction") ?? "");
  const listingChangesValue = String(
    formData.get("listingChanges") ?? "",
  ).trim();
  let listingChanges: unknown;
  if (listingChangesValue) {
    try {
      listingChanges = JSON.parse(listingChangesValue);
    } catch {
      throw new Error("Listing edit details are not valid JSON.");
    }
  }

  await resolveModerationItem(
    queueId,
    {
      decision,
      notes,
      listingAction: listingAction || undefined,
      listingChanges,
    },
    actor.id,
  );
  revalidatePath("/admin");
  revalidatePath("/admin/metrics");
  revalidatePath("/admin/bookings");
}

export async function updateListingStatusAction(formData: FormData) {
  const actor = await getAdminActor("moderator");
  const listingId = String(formData.get("listingId") ?? "");
  const status = String(formData.get("status") ?? "");

  await updateAdminListing(listingId, { status }, actor.id);
  revalidatePath("/admin/listings");
  revalidatePath("/admin/metrics");
}

export async function createListingAction(formData: FormData) {
  const actor = await getAdminActor("moderator");
  const name = String(formData.get("name") ?? "");
  const category = String(formData.get("category") ?? "resort");
  const status = String(formData.get("status") ?? "draft");
  const description = String(formData.get("description") ?? "").trim();

  await createAdminListing(
    {
      name,
      category,
      status,
      description: description || null,
    },
    actor.id,
  );
  revalidatePath("/admin/listings");
  revalidatePath("/admin/metrics");
}

export async function mergeListingsAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  const sourceListingId = String(formData.get("sourceListingId") ?? "");
  const targetListingId = String(formData.get("targetListingId") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await mergeAdminListings(
    {
      sourceListingId,
      targetListingId,
      notes,
      archiveSource: true,
    },
    actor.id,
  );
  revalidatePath("/admin/listings");
  revalidatePath("/admin/metrics");
}

export async function manageBookingAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  const bookingId = String(formData.get("bookingId") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const refundAmountValue = String(formData.get("refundAmount") ?? "").trim();

  await adminManageBooking(
    bookingId,
    {
      action,
      reason,
      refundAmount: refundAmountValue ? Number(refundAmountValue) : undefined,
      note: reason,
    },
    actor.id,
  );
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/metrics");
}

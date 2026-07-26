"use server";

import { revalidatePath } from "next/cache";

import {
  assignAdminAreas,
  getAdminActor,
  repairAdminLocation,
  repairAdminPrimaryRate,
  repairAdminProvenance,
} from "@/modules/admin";

function done() {
  revalidatePath("/admin/data-quality");
  revalidatePath("/admin/listings");
}

export async function repairLocationAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  await repairAdminLocation(
    String(formData.get("listingId") ?? ""),
    {
      latitude: Number(formData.get("latitude") ?? NaN),
      longitude: Number(formData.get("longitude") ?? NaN),
      canonicalAreaId: String(formData.get("canonicalAreaId") ?? "") || null,
      resolvedAddress: String(formData.get("resolvedAddress") ?? ""),
      evidenceUrl: String(formData.get("evidenceUrl") ?? ""),
      overrideReason: String(formData.get("overrideReason") ?? ""),
      sourceNote: String(formData.get("sourceNote") ?? ""),
    },
    actor.id,
  );
  done();
}

export async function assignAreasAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  await assignAdminAreas(
    {
      listingIds: formData.getAll("listingIds").map(String),
      canonicalAreaId: String(formData.get("canonicalAreaId") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
    actor.id,
  );
  done();
}

export async function repairPrimaryRateAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  await repairAdminPrimaryRate(
    String(formData.get("listingId") ?? ""),
    {
      rateId: String(formData.get("rateId") ?? ""),
      makePrimary: true,
      active: true,
      evidenceUrl: String(formData.get("evidenceUrl") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
    actor.id,
  );
  done();
}

export async function repairProvenanceAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  await repairAdminProvenance(
    String(formData.get("listingId") ?? ""),
    {
      fieldName: String(formData.get("fieldName") ?? ""),
      trustStatus: String(formData.get("trustStatus") ?? ""),
      evidenceUrl: String(formData.get("evidenceUrl") ?? "") || undefined,
      sourceNote: String(formData.get("sourceNote") ?? ""),
    },
    actor.id,
  );
  done();
}

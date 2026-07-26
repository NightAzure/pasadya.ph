"use server";

import { revalidatePath } from "next/cache";
import { getAdminActor, recordAdminDuplicateReview } from "@/modules/admin";

export async function reviewDuplicateAction(formData: FormData) {
  const actor = await getAdminActor("admin");
  await recordAdminDuplicateReview(
    {
      sourceListingId: String(formData.get("sourceListingId") ?? ""),
      candidateListingId: String(formData.get("candidateListingId") ?? ""),
      decision: String(formData.get("decision") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
    actor.id,
  );
  revalidatePath("/admin/data-quality");
}

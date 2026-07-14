import { z } from "zod";

import { createSignedUpload as createStorageSignedUpload } from "@/modules/storage";

export const claimUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
});

export const photoUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
});

export type UploadMetadata = z.infer<typeof claimUploadSchema>;

/** Issues a signed upload descriptor. Uses R2 when configured, otherwise the
 * local development PUT + EXIF processing path. */
export function createDevSignedUpload(
  metadata: UploadMetadata,
  scope: "claim" | "listing-photo" | "review-photo",
) {
  const upload = createStorageSignedUpload({
    fileName: metadata.fileName,
    contentType: metadata.contentType,
    sizeBytes: metadata.sizeBytes,
    scope,
  });

  return {
    storageKey: upload.storageKey,
    uploadUrl: upload.uploadUrl,
    method: upload.method,
    headers: upload.headers,
    maxBytes: upload.maxBytes,
    exifGpsStripped: metadata.contentType.startsWith("image/"),
    provider: upload.provider,
    publicUrl: upload.publicUrl,
    processUrl: upload.processUrl,
    note: upload.note,
  };
}

export const createSignedUpload = createDevSignedUpload;

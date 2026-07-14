import { stripExifGps, sniffImageContentType } from "./exif";
import {
  createSignedUpload,
  isPrivateScope,
  isR2Configured,
  putR2Object,
  type StorageScope,
} from "./r2";

export type ProcessedUpload = {
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  exifGpsStripped: boolean;
  provider: "r2" | "development";
  publicUrl: string | null;
  note: string;
};

const devObjectStore = new Map<
  string,
  { bytes: Uint8Array; contentType: string; processed: boolean }
>();

export function putDevObject(
  storageKey: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const sniffed = sniffImageContentType(bytes);
  if (
    sniffed &&
    sniffed !== contentType &&
    !contentType.startsWith("application/")
  ) {
    throw new Error(
      `Uploaded bytes do not match declared content type (${contentType}).`,
    );
  }
  if (
    contentType === "application/pdf" &&
    sniffed &&
    sniffed !== "application/pdf"
  ) {
    throw new Error("Uploaded bytes are not a PDF.");
  }
  if (contentType.startsWith("image/") && !sniffed) {
    throw new Error("Uploaded bytes are not a recognized image.");
  }

  let processed = bytes;
  let exifGpsStripped = false;
  let note = "Stored development object.";
  if (contentType.startsWith("image/")) {
    const result = stripExifGps(bytes, contentType);
    processed = result.bytes;
    exifGpsStripped = result.exifGpsStripped;
    note = result.note;
  }

  devObjectStore.set(storageKey, {
    bytes: processed,
    contentType,
    processed: true,
  });

  return {
    storageKey,
    contentType,
    sizeBytes: processed.byteLength,
    exifGpsStripped,
    provider: "development" as const,
    publicUrl: isPrivateScope(scopeFromKey(storageKey))
      ? null
      : `/api/uploads/dev/${storageKey}`,
    note,
  } satisfies ProcessedUpload;
}

export function getDevObject(storageKey: string) {
  return devObjectStore.get(storageKey) ?? null;
}

export async function processUploadedObject(input: {
  storageKey: string;
  contentType: string;
  bytes?: Uint8Array;
}): Promise<ProcessedUpload> {
  const scope = scopeFromKey(input.storageKey);
  if (isR2Configured()) {
    if (!input.bytes) {
      throw new Error(
        "R2 processing requires the uploaded bytes or a downloadable object body.",
      );
    }
    const result = input.contentType.startsWith("image/")
      ? stripExifGps(input.bytes, input.contentType)
      : {
          bytes: input.bytes,
          contentType: input.contentType,
          exifGpsStripped: false,
          changed: false,
          note: "Non-image object accepted without EXIF rewrite.",
        };

    if (result.changed) {
      await putR2Object({
        storageKey: input.storageKey,
        contentType: result.contentType,
        bytes: result.bytes,
      });
    }

    const publicBase = process.env.R2_PUBLIC_BASE_URL ?? null;
    return {
      storageKey: input.storageKey,
      contentType: result.contentType,
      sizeBytes: result.bytes.byteLength,
      exifGpsStripped: result.exifGpsStripped,
      provider: "r2",
      publicUrl:
        isPrivateScope(scope) || !publicBase
          ? null
          : `${publicBase.replace(/\/$/, "")}/${input.storageKey}`,
      note: result.note,
    };
  }

  const existing = getDevObject(input.storageKey);
  if (existing) {
    return {
      storageKey: input.storageKey,
      contentType: existing.contentType,
      sizeBytes: existing.bytes.byteLength,
      exifGpsStripped: existing.processed,
      provider: "development",
      publicUrl: isPrivateScope(scope)
        ? null
        : `/api/uploads/dev/${input.storageKey}`,
      note: "Development object already processed on PUT.",
    };
  }

  if (!input.bytes) {
    throw new Error("Upload object was not found for processing.");
  }
  return putDevObject(input.storageKey, input.bytes, input.contentType);
}

function scopeFromKey(storageKey: string): StorageScope {
  const scope = storageKey.split("/")[0];
  if (
    scope === "claim" ||
    scope === "listing-photo" ||
    scope === "review-photo"
  ) {
    return scope;
  }
  throw new Error("Invalid storage key scope.");
}

export { createSignedUpload, isR2Configured, isPrivateScope };
export type { StorageScope, SignedUpload } from "./r2";

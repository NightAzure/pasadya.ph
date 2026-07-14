import { createHmac, createHash } from "node:crypto";

export type StorageScope = "claim" | "listing-photo" | "review-photo";

export type SignedUpload = {
  storageKey: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  maxBytes: number;
  exifGpsStripped: boolean;
  provider: "r2" | "development";
  publicUrl: string | null;
  processUrl: string;
  note: string;
};

function r2Configured() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  return Boolean(
    accountId &&
    accessKeyId &&
    secretAccessKey &&
    bucket &&
    !accountId.startsWith("replace-with-") &&
    !accessKeyId.startsWith("replace-with-") &&
    !secretAccessKey.startsWith("replace-with-") &&
    !bucket.startsWith("replace-with-"),
  );
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function amzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

/** Creates an S3-compatible presigned PUT URL for Cloudflare R2. */
function createR2PresignedPut(input: {
  storageKey: string;
  contentType: string;
  maxBytes: number;
}): SignedUpload {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET_NAME!;
  const region = process.env.R2_REGION ?? "auto";
  const endpoint =
    process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`;
  const publicBase = process.env.R2_PUBLIC_BASE_URL ?? null;
  const expiresIn = 15 * 60;
  const { amzDate: datetime, dateStamp } = amzDate();
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const host = new URL(endpoint).host;
  const canonicalUri = `/${bucket}/${input.storageKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": datetime,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "content-type;host",
  });

  const canonicalHeaders = `content-type:${input.contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");
  query.set("X-Amz-Signature", signature);

  const uploadUrl = `${endpoint}${canonicalUri}?${query.toString()}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    storageKey: input.storageKey,
    uploadUrl,
    method: "PUT",
    headers: {
      "content-type": input.contentType,
    },
    maxBytes: input.maxBytes,
    exifGpsStripped: false,
    provider: "r2",
    publicUrl: publicBase
      ? `${publicBase.replace(/\/$/, "")}/${input.storageKey}`
      : null,
    processUrl: `${appUrl}/api/uploads/process`,
    note: "Cloudflare R2 signed upload. Call processUrl after PUT to strip EXIF GPS and finalize ACLs.",
  };
}

/** Puts bytes to an existing R2 object key using a fresh short-lived signed URL. */
export async function putR2Object(input: {
  storageKey: string;
  contentType: string;
  bytes: Uint8Array;
}) {
  const signed = createR2PresignedPut({
    storageKey: input.storageKey,
    contentType: input.contentType,
    maxBytes: input.bytes.byteLength,
  });
  const response = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: signed.headers,
    body: Buffer.from(input.bytes),
  });
  if (!response.ok) {
    throw new Error(`Failed to write R2 object (${response.status}).`);
  }
}

function createDevSignedUpload(input: {
  storageKey: string;
  contentType: string;
  maxBytes: number;
}): SignedUpload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    storageKey: input.storageKey,
    uploadUrl: `/api/uploads/dev/${input.storageKey}`,
    method: "PUT",
    headers: {
      "content-type": input.contentType,
    },
    maxBytes: input.maxBytes,
    exifGpsStripped: false,
    provider: "development",
    publicUrl: `/api/uploads/dev/${input.storageKey}`,
    processUrl: `${appUrl}/api/uploads/process`,
    note: "Development signed upload. PUT to uploadUrl, then POST processUrl to strip EXIF GPS.",
  };
}

export function createSignedUpload(input: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  scope: StorageScope;
  maxBytes?: number;
}): SignedUpload {
  const maxBytes = input.maxBytes ?? 10 * 1024 * 1024;
  const storageKey = `${input.scope}/${crypto.randomUUID()}-${sanitizeFileName(input.fileName)}`;
  const payload = {
    storageKey,
    contentType: input.contentType,
    maxBytes,
  };
  return r2Configured()
    ? createR2PresignedPut(payload)
    : createDevSignedUpload(payload);
}

export function isR2Configured() {
  return r2Configured();
}

export function isPrivateScope(scope: StorageScope) {
  return scope === "claim";
}

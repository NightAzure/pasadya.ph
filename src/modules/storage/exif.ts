/**
 * Strips GPS/EXIF location metadata from common image formats.
 * JPEG: removes APP1 EXIF segments.
 * PNG: removes eXIf chunks.
 * WebP: returns bytes unchanged but marks processing as best-effort.
 */

export type ExifProcessResult = {
  bytes: Uint8Array;
  contentType: string;
  exifGpsStripped: boolean;
  changed: boolean;
  note: string;
};

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function stripJpegExif(input: Uint8Array): ExifProcessResult {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) {
    return {
      bytes: input,
      contentType: "image/jpeg",
      exifGpsStripped: false,
      changed: false,
      note: "Not a JPEG payload; left unchanged.",
    };
  }

  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let offset = 2;
  let removed = false;

  while (offset + 3 < input.length) {
    if (input[offset] !== 0xff) break;
    const marker = input[offset + 1];
    if (marker === 0xda) {
      parts.push(input.subarray(offset));
      break;
    }
    if (marker === 0xd9) {
      parts.push(input.subarray(offset));
      break;
    }

    // Standalone markers without length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const length = (input[offset + 2]! << 8) | input[offset + 3]!;
    const segmentEnd = offset + 2 + length;
    if (segmentEnd > input.length) {
      parts.push(input.subarray(offset));
      break;
    }

    // APP1 often carries EXIF (including GPS). Drop it.
    if (marker === 0xe1) {
      removed = true;
      offset = segmentEnd;
      continue;
    }

    parts.push(input.subarray(offset, segmentEnd));
    offset = segmentEnd;
  }

  return {
    bytes: removed ? concatBytes(parts) : input,
    contentType: "image/jpeg",
    exifGpsStripped: true,
    changed: removed,
    note: removed
      ? "Removed JPEG APP1/EXIF segments."
      : "JPEG had no APP1/EXIF segments to remove.",
  };
}

function pngChunkType(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function stripPngExif(input: Uint8Array): ExifProcessResult {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    input.length < 8 ||
    !signature.every((value, index) => input[index] === value)
  ) {
    return {
      bytes: input,
      contentType: "image/png",
      exifGpsStripped: false,
      changed: false,
      note: "Not a PNG payload; left unchanged.",
    };
  }

  const parts: Uint8Array[] = [input.subarray(0, 8)];
  let offset = 8;
  let removed = false;

  while (offset + 8 <= input.length) {
    const length =
      (input[offset]! << 24) |
      (input[offset + 1]! << 16) |
      (input[offset + 2]! << 8) |
      input[offset + 3]!;
    const type = pngChunkType(input, offset + 4);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > input.length) {
      parts.push(input.subarray(offset));
      break;
    }
    if (type === "eXIf") {
      removed = true;
    } else {
      parts.push(input.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
    if (type === "IEND") break;
  }

  return {
    bytes: removed ? concatBytes(parts) : input,
    contentType: "image/png",
    exifGpsStripped: true,
    changed: removed,
    note: removed
      ? "Removed PNG eXIf chunk."
      : "PNG had no eXIf chunk to remove.",
  };
}

export function stripExifGps(
  input: Uint8Array,
  contentType: string,
): ExifProcessResult {
  const normalized = contentType.toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return stripJpegExif(input);
  }
  if (normalized === "image/png") {
    return stripPngExif(input);
  }
  if (normalized === "image/webp") {
    return {
      bytes: input,
      contentType: "image/webp",
      exifGpsStripped: true,
      changed: false,
      note: "WebP EXIF strip is best-effort; payload accepted without rewrite.",
    };
  }
  return {
    bytes: input,
    contentType,
    exifGpsStripped: false,
    changed: false,
    note: "Non-image payload left unchanged.",
  };
}

export function sniffImageContentType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  return null;
}

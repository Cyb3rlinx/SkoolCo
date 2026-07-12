/**
 * Image upload validation (POST /api/uploads).
 *
 * Security posture: allowlist of raster formats only (SVG is excluded on
 * purpose — it can embed scripts), hard size cap, and the actual bytes are
 * sniffed against magic numbers so a renamed file can't lie about its type.
 */

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export const ALLOWED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

/** Detect the real image type from its first bytes. Null = not an allowed type. */
export function sniffImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ImageValidation =
  | { ok: true; mime: AllowedImageMime }
  | { ok: false; error: string };

/** Validate size + declared mime + magic bytes. Returns the SNIFFED mime. */
export function validateImageUpload(bytes: Uint8Array, declaredMime: string): ImageValidation {
  if (bytes.byteLength === 0) return { ok: false, error: "Empty file" };
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image too large (max 2MB)" };
  }
  if (!(ALLOWED_IMAGE_MIMES as readonly string[]).includes(declaredMime)) {
    return { ok: false, error: "Unsupported image type (allowed: PNG, JPEG, WebP)" };
  }
  const sniffed = sniffImageMime(bytes);
  if (!sniffed) {
    return { ok: false, error: "File content is not a valid PNG, JPEG or WebP image" };
  }
  return { ok: true, mime: sniffed };
}

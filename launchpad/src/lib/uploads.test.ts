import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, sniffImageMime, validateImageUpload } from "./uploads";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 1, 2,
]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3, 4]);

describe("sniffImageMime", () => {
  it("detects png, jpeg and webp by magic bytes", () => {
    expect(sniffImageMime(PNG)).toBe("image/png");
    expect(sniffImageMime(JPEG)).toBe("image/jpeg");
    expect(sniffImageMime(WEBP)).toBe("image/webp");
  });

  it("rejects other formats and garbage", () => {
    expect(sniffImageMime(GIF)).toBeNull();
    expect(sniffImageMime(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
    expect(sniffImageMime(new Uint8Array([]))).toBeNull();
  });
});

describe("validateImageUpload", () => {
  it("accepts a valid image and returns the sniffed mime", () => {
    expect(validateImageUpload(PNG, "image/png")).toEqual({ ok: true, mime: "image/png" });
  });

  it("rejects empty files", () => {
    expect(validateImageUpload(new Uint8Array([]), "image/png").ok).toBe(false);
  });

  it("rejects files over the size cap", () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(PNG);
    const res = validateImageUpload(big, "image/png");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/large/i);
  });

  it("rejects disallowed declared mimes (svg, gif)", () => {
    expect(validateImageUpload(PNG, "image/svg+xml").ok).toBe(false);
    expect(validateImageUpload(GIF, "image/gif").ok).toBe(false);
  });

  it("rejects content that does not match an allowed format (renamed file)", () => {
    const res = validateImageUpload(GIF, "image/png");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/not a valid/i);
  });
});

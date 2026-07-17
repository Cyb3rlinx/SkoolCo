import { describe, it, expect } from "vitest";
// Imported from lib/cors (not @/middleware) so this test doesn't have to
// load next-intl/middleware, which isn't resolvable under Vitest's plain
// Node environment (Next.js's bundler handles that resolution; Vitest
// doesn't). See src/lib/cors.ts.
import { isAllowedOrigin } from "@/lib/cors";

describe("isAllowedOrigin", () => {
  it("allows origins listed in the env", () => {
    expect(isAllowedOrigin("chrome-extension://abc", "chrome-extension://abc,https://x.com")).toBe(true);
  });
  it("rejects unlisted origins", () => {
    expect(isAllowedOrigin("https://evil.com", "chrome-extension://abc")).toBe(false);
  });
  it("rejects everything when env is empty or missing", () => {
    expect(isAllowedOrigin("chrome-extension://abc", "")).toBe(false);
    expect(isAllowedOrigin("chrome-extension://abc", undefined)).toBe(false);
  });
  it("rejects a null origin", () => {
    expect(isAllowedOrigin(null, "chrome-extension://abc")).toBe(false);
  });
});

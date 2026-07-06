import { describe, it, expect } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const rule = { limit: 3, windowMs: 60_000 };
    const key = "test:allow-then-block";
    expect(checkRateLimit(key, rule)).toBe(true);
    expect(checkRateLimit(key, rule)).toBe(true);
    expect(checkRateLimit(key, rule)).toBe(true);
    expect(checkRateLimit(key, rule)).toBe(false);
  });
  it("isolates buckets by key", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("test:iso:a", rule)).toBe(true);
    expect(checkRateLimit("test:iso:b", rule)).toBe(true);
  });
  it("exposes login and resendVerification rules", () => {
    expect(RATE_LIMITS.login).toEqual({ limit: 5, windowMs: 900_000 });
    expect(RATE_LIMITS.resendVerification).toEqual({ limit: 3, windowMs: 900_000 });
  });
});

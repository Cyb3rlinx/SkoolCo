import { describe, it, expect } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", async () => {
    const rule = { limit: 3, windowMs: 60_000 };
    const key = "test:allow-then-block";
    expect(await checkRateLimit(key, rule)).toBe(true);
    expect(await checkRateLimit(key, rule)).toBe(true);
    expect(await checkRateLimit(key, rule)).toBe(true);
    expect(await checkRateLimit(key, rule)).toBe(false);
  });
  it("isolates buckets by key", async () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(await checkRateLimit("test:iso:a", rule)).toBe(true);
    expect(await checkRateLimit("test:iso:b", rule)).toBe(true);
  });
  it("exposes login and resendVerification rules", () => {
    expect(RATE_LIMITS.login).toEqual({ limit: 5, windowMs: 900_000 });
    expect(RATE_LIMITS.resendVerification).toEqual({ limit: 3, windowMs: 900_000 });
  });
});

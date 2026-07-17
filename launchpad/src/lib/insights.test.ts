import { describe, it, expect } from "vitest";
import { bucketByDay } from "@/lib/insights";

describe("bucketByDay", () => {
  it("returns `days` buckets ending today, oldest first", () => {
    const now = new Date("2026-07-17T15:00:00Z");
    const buckets = bucketByDay([], 3, now);
    expect(buckets.map((b) => b.date)).toEqual(["2026-07-15", "2026-07-16", "2026-07-17"]);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("counts each date into its UTC day bucket", () => {
    const now = new Date("2026-07-17T15:00:00Z");
    const dates = [
      new Date("2026-07-17T01:00:00Z"),
      new Date("2026-07-17T23:00:00Z"),
      new Date("2026-07-16T12:00:00Z"),
    ];
    const buckets = bucketByDay(dates, 3, now);
    const byDate = Object.fromEntries(buckets.map((b) => [b.date, b.count]));
    expect(byDate["2026-07-15"]).toBe(0);
    expect(byDate["2026-07-16"]).toBe(1);
    expect(byDate["2026-07-17"]).toBe(2);
  });

  it("ignores dates outside the window", () => {
    const now = new Date("2026-07-17T15:00:00Z");
    const dates = [new Date("2026-07-01T00:00:00Z")];
    const buckets = bucketByDay(dates, 3, now);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });
});

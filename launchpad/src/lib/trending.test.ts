import { describe, it, expect } from "vitest";
import { recentWindowStart } from "@/lib/trending";

describe("recentWindowStart", () => {
  it("devuelve el instante 24 horas antes de `now`", () => {
    const now = new Date("2026-07-17T12:00:00Z");
    const start = recentWindowStart(now, 24);
    expect(start.toISOString()).toBe("2026-07-16T12:00:00.000Z");
  });

  it("funciona con otras ventanas (ej. 72 horas)", () => {
    const now = new Date("2026-07-17T00:00:00Z");
    const start = recentWindowStart(now, 72);
    expect(start.toISOString()).toBe("2026-07-14T00:00:00.000Z");
  });
});

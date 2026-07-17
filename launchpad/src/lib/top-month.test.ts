import { describe, it, expect } from "vitest";
import { previousCalendarMonthRange } from "@/lib/top-month";

describe("previousCalendarMonthRange", () => {
  it("devuelve junio completo cuando `now` es el 1 de julio", () => {
    const { start, end } = previousCalendarMonthRange(new Date("2026-07-01T14:00:00Z"));
    expect(start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("cruza el año correctamente en enero", () => {
    const { start, end } = previousCalendarMonthRange(new Date("2027-01-01T00:00:00Z"));
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

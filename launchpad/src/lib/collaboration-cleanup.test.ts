import { describe, it, expect } from "vitest";
import { selectExpiredCollaborations, COLLABORATION_MAX_AGE_DAYS } from "./collaboration-cleanup";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-07-17T00:00:00Z");

describe("selectExpiredCollaborations", () => {
  it("selects a collaboration exactly at the age threshold", () => {
    const createdAt = new Date(now.getTime() - COLLABORATION_MAX_AGE_DAYS * DAY_MS);
    expect(selectExpiredCollaborations([{ id: "1", createdAt }], now)).toHaveLength(1);
  });

  it("selects a collaboration older than the threshold", () => {
    const createdAt = new Date(now.getTime() - (COLLABORATION_MAX_AGE_DAYS + 5) * DAY_MS);
    expect(selectExpiredCollaborations([{ id: "1", createdAt }], now)).toHaveLength(1);
  });

  it("excludes a collaboration younger than the threshold", () => {
    const createdAt = new Date(now.getTime() - (COLLABORATION_MAX_AGE_DAYS - 1) * DAY_MS);
    expect(selectExpiredCollaborations([{ id: "1", createdAt }], now)).toHaveLength(0);
  });

  it("returns an empty array for an empty input", () => {
    expect(selectExpiredCollaborations([], now)).toEqual([]);
  });

  it("preserves extra caller fields (generic)", () => {
    const createdAt = new Date(now.getTime() - (COLLABORATION_MAX_AGE_DAYS + 1) * DAY_MS);
    const result = selectExpiredCollaborations([{ id: "1", createdAt, title: "x" }], now);
    expect(result[0]?.title).toBe("x");
  });
});

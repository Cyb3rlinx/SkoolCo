import { describe, it, expect, vi, afterEach } from "vitest";
import { submitLink, getMyLinks } from "./api";

const BASE = "http://localhost:3000";
afterEach(() => vi.unstubAllGlobals());

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  );
}

describe("api error mapping", () => {
  it("201 → ok con data", async () => {
    stubFetch(201, { data: { id: "1", status: "PENDING" } });
    const r = await submitLink(BASE, { title: "T", url: "https://www.skool.com/c/p", type: "logro" });
    expect(r.ok).toBe(true);
  });
  it("401 → unauthorized", async () => {
    stubFetch(401, { error: { message: "Authentication required" } });
    const r = await getMyLinks(BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("unauthorized");
  });
  it("409 → duplicate, 429 → rate_limited", async () => {
    stubFetch(409, { error: { message: "dup" } });
    const dup = await submitLink(BASE, { title: "T", url: "https://www.skool.com/c/p", type: "logro" });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.kind).toBe("duplicate");
    stubFetch(429, { error: { message: "slow" } });
    const rl = await submitLink(BASE, { title: "T", url: "https://www.skool.com/c/p", type: "logro" });
    expect(rl.ok).toBe(false);
    if (!rl.ok) expect(rl.kind).toBe("rate_limited");
  });
  it("red caída → network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const r = await getMyLinks(BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("network");
  });
});

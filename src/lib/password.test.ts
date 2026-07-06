import { describe, it, expect, vi, afterEach } from "vitest";
import { isPasswordPwned } from "@/lib/password";

describe("isPasswordPwned", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns true when the hash suffix appears in the range", async () => {
    // sha1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // prefix 5BAA6, suffix 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:99\nAAAA:1",
      })
    );
    expect(await isPasswordPwned("password")).toBe(true);
  });

  it("returns false when not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => "AAAA:1\nBBBB:2" })
    );
    expect(await isPasswordPwned("s0me-Uniqu3-p@ss")).toBe(false);
  });

  it("fails open on network error (returns false)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await isPasswordPwned("whatever")).toBe(false);
  });
});

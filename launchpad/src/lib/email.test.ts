import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendEmail", () => {
  const OLD = process.env.RESEND_API_KEY;
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });
  afterEach(() => {
    if (OLD === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = OLD;
    vi.unstubAllGlobals();
  });

  it("logs instead of sending when no API key", async () => {
    delete process.env.RESEND_API_KEY;
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>x</p>" });
    expect(spy).toHaveBeenCalled();
  });

  it("calls Resend API when key is present", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "no-reply@test.com";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>x</p>" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });
});

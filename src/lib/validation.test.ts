import { describe, it, expect } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  createReportSchema,
  createCommunityLinkSchema,
} from "@/lib/validation";

describe("password schemas", () => {
  it("forgot requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@y.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("reset requires token + password >= 8", () => {
    expect(resetPasswordSchema.safeParse({ token: "tok-abcdef", password: "12345678" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "tok-abcdef", password: "short" }).success).toBe(false);
  });
});

describe("createReportSchema", () => {
  it("accepts exactly one of productId/commentId", () => {
    expect(createReportSchema.safeParse({ productId: "p1", reason: "spam!!" }).success).toBe(true);
    expect(createReportSchema.safeParse({ commentId: "c1", reason: "spam!!" }).success).toBe(true);
  });
  it("rejects both or neither", () => {
    expect(createReportSchema.safeParse({ productId: "p1", commentId: "c1", reason: "spam!!" }).success).toBe(false);
    expect(createReportSchema.safeParse({ reason: "spam!!" }).success).toBe(false);
  });
});

describe("createCommunityLinkSchema", () => {
  it("accepts https links from allowlisted platforms", () => {
    for (const url of [
      "https://www.skool.com/x",
      "https://discord.com/channels/1/2/3",
      "https://www.youtube.com/watch?v=abc",
      "https://x.com/user/status/1",
      "https://t.me/canal/123",
    ]) {
      expect(createCommunityLinkSchema.safeParse({ title: "Logro", url }).success).toBe(true);
    }
  });
  it("rejects non-allowlisted or non-https", () => {
    expect(createCommunityLinkSchema.safeParse({ title: "x", url: "https://evil.com/x" }).success).toBe(false);
    expect(createCommunityLinkSchema.safeParse({ title: "x", url: "http://www.skool.com/x" }).success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  createReportSchema,
  createCommunityLinkSchema,
  createProductSchema,
  createContactRequestSchema,
  adminUpdateUserSchema,
  listProductsQuerySchema,
} from "@/lib/validation";

describe("listProductsQuerySchema", () => {
  it("openToOffers es opcional", () => {
    const result = listProductsQuerySchema.safeParse({});
    expect(result.success && result.data.openToOffers).toBeUndefined();
  });

  it("coacciona ?openToOffers=true a booleano", () => {
    const result = listProductsQuerySchema.safeParse({ openToOffers: "true" });
    expect(result.success && result.data.openToOffers).toBe(true);
  });
});

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

describe("offer bridge fields (createProductSchema)", () => {
  const base = {
    name: "Producto",
    tagline: "Una tagline válida",
    description: "Una descripción suficientemente larga.",
    categoryId: "cat1",
    launchDate: "2026-07-13T12:00:00.000Z",
  };

  it("accepts declared offer fields", () => {
    const parsed = createProductSchema.parse({
      ...base,
      openToOffers: true,
      declaredMrrUsd: 1500,
      monetizationNote: "Suscripciones mensuales",
    });
    expect(parsed.openToOffers).toBe(true);
    expect(parsed.declaredMrrUsd).toBe(1500);
  });

  it("rejects negative or non-integer MRR", () => {
    expect(() => createProductSchema.parse({ ...base, declaredMrrUsd: -5 })).toThrow();
    expect(() => createProductSchema.parse({ ...base, declaredMrrUsd: 10.5 })).toThrow();
  });

  it("rejects monetizationNote over 200 chars", () => {
    expect(() =>
      createProductSchema.parse({ ...base, monetizationNote: "x".repeat(201) })
    ).toThrow();
  });
});

describe("createContactRequestSchema", () => {
  it("accepts a reasonable message", () => {
    const parsed = createContactRequestSchema.parse({
      message: "Hola, me interesa tu producto. ¿Podemos hablar de una posible compra?",
    });
    expect(parsed.message.length).toBeGreaterThan(19);
  });

  it("rejects short and giant messages", () => {
    expect(() => createContactRequestSchema.parse({ message: "hola" })).toThrow();
    expect(() => createContactRequestSchema.parse({ message: "x".repeat(1001) })).toThrow();
  });
});

describe("adminUpdateUserSchema", () => {
  it("acepta cambio de rol, de suspensión, o ambos", () => {
    expect(adminUpdateUserSchema.safeParse({ role: "MODERATOR" }).success).toBe(true);
    expect(adminUpdateUserSchema.safeParse({ suspended: true }).success).toBe(true);
    expect(adminUpdateUserSchema.safeParse({ role: "USER", suspended: false }).success).toBe(true);
  });

  it("rechaza body vacío y rol inválido", () => {
    expect(adminUpdateUserSchema.safeParse({}).success).toBe(false);
    expect(adminUpdateUserSchema.safeParse({ role: "SUPERADMIN" }).success).toBe(false);
  });
});

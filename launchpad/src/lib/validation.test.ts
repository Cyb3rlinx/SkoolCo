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
  createCollectionSchema,
  createProductUpdateSchema,
  usernameSchema,
  createCollaborationSchema,
  listCollaborationsQuerySchema,
  createCollaborationContactRequestSchema,
} from "@/lib/validation";

describe("createCollectionSchema", () => {
  it("acepta título y descripción válidos", () => {
    expect(
      createCollectionSchema.safeParse({
        title: "Mejores herramientas de IA",
        description: "Una selección curada de productos de IA lanzados esta semana.",
      }).success
    ).toBe(true);
  });

  it("rechaza título muy corto", () => {
    expect(createCollectionSchema.safeParse({ title: "ai", description: "x".repeat(20) }).success).toBe(false);
  });

  it("rechaza descripción muy corta", () => {
    expect(
      createCollectionSchema.safeParse({ title: "Título válido", description: "corta" }).success
    ).toBe(false);
  });
});

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

describe("createProductUpdateSchema", () => {
  it("acepta un body válido", () => {
    expect(createProductUpdateSchema.safeParse({ body: "Lanzamos soporte para modo oscuro." }).success).toBe(true);
  });

  it("rechaza menos de 5 caracteres", () => {
    expect(createProductUpdateSchema.safeParse({ body: "hola" }).success).toBe(false);
  });

  it("rechaza más de 1000 caracteres", () => {
    expect(createProductUpdateSchema.safeParse({ body: "a".repeat(1001) }).success).toBe(false);
  });

  it("recorta espacios", () => {
    const result = createProductUpdateSchema.safeParse({ body: "  novedad importante  " });
    expect(result.success && result.data.body).toBe("novedad importante");
  });
});

describe("usernameSchema", () => {
  it("acepta un username válido", () => {
    expect(usernameSchema.parse("willy-dev")).toBe("willy-dev");
  });

  it("normaliza a minúsculas", () => {
    expect(usernameSchema.parse("Willy-Dev")).toBe("willy-dev");
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("rechaza caracteres fuera de [a-z0-9-]", () => {
    expect(usernameSchema.safeParse("willy_dev").success).toBe(false);
    expect(usernameSchema.safeParse("willy dev").success).toBe(false);
  });

  it("rechaza nombres reservados", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("DENVELER").success).toBe(false);
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

describe("createCollaborationSchema", () => {
  const valid = {
    type: "NEEDS" as const,
    title: "Busco quien automatice mi soporte",
    description: "Necesito integrar WhatsApp con Shopify y GPT-4o para atención al cliente automática.",
    tags: ["automatizacion", "whatsapp"],
  };

  it("accepts a valid NEEDS listing", () => {
    expect(createCollaborationSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts a valid OFFERS listing", () => {
    expect(createCollaborationSchema.parse({ ...valid, type: "OFFERS" }).type).toBe("OFFERS");
  });

  it("rejects an invalid type", () => {
    expect(() => createCollaborationSchema.parse({ ...valid, type: "MAYBE" })).toThrow();
  });

  it("rejects a title shorter than 5 chars", () => {
    expect(() => createCollaborationSchema.parse({ ...valid, title: "Hi" })).toThrow();
  });

  it("rejects a description shorter than 20 chars", () => {
    expect(() => createCollaborationSchema.parse({ ...valid, description: "muy corto" })).toThrow();
  });

  it("defaults tags to an empty array when omitted", () => {
    const { tags, ...withoutTags } = valid;
    expect(createCollaborationSchema.parse(withoutTags).tags).toEqual([]);
  });

  it("rejects more than 8 tags", () => {
    expect(() =>
      createCollaborationSchema.parse({ ...valid, tags: Array.from({ length: 9 }, (_, i) => `tag${i}`) })
    ).toThrow();
  });

  it("lowercases tags", () => {
    expect(createCollaborationSchema.parse({ ...valid, tags: ["Automatización"] }).tags).toEqual([
      "automatización",
    ]);
  });
});

describe("listCollaborationsQuerySchema", () => {
  it("defaults page/pageSize", () => {
    const parsed = listCollaborationsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("accepts an optional type filter", () => {
    expect(listCollaborationsQuerySchema.parse({ type: "OFFERS" }).type).toBe("OFFERS");
  });

  it("rejects an invalid type filter", () => {
    expect(() => listCollaborationsQuerySchema.parse({ type: "NOPE" })).toThrow();
  });
});

describe("createCollaborationContactRequestSchema", () => {
  it("accepts a message of at least 20 chars", () => {
    const msg = "Hola, me interesa mucho tu propuesta, hablemos.";
    expect(createCollaborationContactRequestSchema.parse({ message: msg }).message).toBe(msg);
  });

  it("rejects a message shorter than 20 chars", () => {
    expect(() => createCollaborationContactRequestSchema.parse({ message: "muy corto" })).toThrow();
  });
});

describe("createReportSchema with collaborationId", () => {
  it("accepts a report targeting a collaboration", () => {
    const parsed = createReportSchema.parse({ collaborationId: "abc123", reason: "Contenido de spam" });
    expect(parsed.collaborationId).toBe("abc123");
  });

  it("rejects a report with both productId and collaborationId", () => {
    expect(() =>
      createReportSchema.parse({ productId: "p1", collaborationId: "c1", reason: "Motivo válido" })
    ).toThrow();
  });

  it("rejects a report with no target", () => {
    expect(() => createReportSchema.parse({ reason: "Motivo válido" })).toThrow();
  });
});

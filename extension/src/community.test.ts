import { describe, it, expect } from "vitest";
import { isCommunityPostUrl, cleanTitle } from "./community";

describe("isCommunityPostUrl", () => {
  it("acepta posts https de las plataformas del allowlist", () => {
    expect(isCommunityPostUrl("https://www.skool.com/mi-comunidad/gran-logro-123")).toBe(true);
    expect(isCommunityPostUrl("https://discord.com/channels/123/456/789")).toBe(true);
    expect(isCommunityPostUrl("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(isCommunityPostUrl("https://youtu.be/abc")).toBe(true);
    expect(isCommunityPostUrl("https://x.com/usuario/status/1")).toBe(true);
    expect(isCommunityPostUrl("https://t.me/canal/123")).toBe(true);
    expect(isCommunityPostUrl("https://mi-com.circle.so/c/post")).toBe(true);
  });
  it("rechaza homepages, http, dominios ajenos y rutas reservadas", () => {
    expect(isCommunityPostUrl("https://www.skool.com/")).toBe(false);
    expect(isCommunityPostUrl("https://discord.com/")).toBe(false);
    expect(isCommunityPostUrl("http://www.skool.com/c/post")).toBe(false);
    expect(isCommunityPostUrl("https://evil.com/skool.com/post")).toBe(false);
    expect(isCommunityPostUrl("https://www.skool.com/signup")).toBe(false);
    expect(isCommunityPostUrl("https://x.com/login")).toBe(false);
    expect(isCommunityPostUrl("no-es-url")).toBe(false);
  });
});

describe("cleanTitle", () => {
  it("quita sufijos de plataforma y recorta espacios", () => {
    expect(cleanTitle("Mi gran logro | Skool")).toBe("Mi gran logro");
    expect(cleanTitle("  Hito - Skool ")).toBe("Hito");
    expect(cleanTitle("Mi video - YouTube")).toBe("Mi video");
    expect(cleanTitle("Un post | LinkedIn")).toBe("Un post");
  });
  it("no toca títulos sin sufijo de plataforma", () => {
    expect(cleanTitle("Logro de la semana - parte 2")).toBe("Logro de la semana - parte 2");
  });
  it("acota a 140 caracteres", () => {
    expect(cleanTitle("x".repeat(200)).length).toBeLessThanOrEqual(140);
  });
});

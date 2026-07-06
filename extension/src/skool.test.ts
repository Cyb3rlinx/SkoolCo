import { describe, it, expect } from "vitest";
import { isSkoolPostUrl, cleanTitle } from "./skool";

describe("isSkoolPostUrl", () => {
  it("acepta posts https de skool.com", () => {
    expect(isSkoolPostUrl("https://www.skool.com/mi-comunidad/gran-logro-123")).toBe(true);
    expect(isSkoolPostUrl("https://skool.com/otra/post-x")).toBe(true);
  });
  it("rechaza raíz de comunidad, http, otros dominios y rutas reservadas", () => {
    expect(isSkoolPostUrl("https://www.skool.com/mi-comunidad")).toBe(false);
    expect(isSkoolPostUrl("http://www.skool.com/c/post")).toBe(false);
    expect(isSkoolPostUrl("https://evil.com/skool.com/post")).toBe(false);
    expect(isSkoolPostUrl("https://www.skool.com/signup/x")).toBe(false);
    expect(isSkoolPostUrl("no-es-url")).toBe(false);
  });
});

describe("cleanTitle", () => {
  it("quita el sufijo de Skool y recorta espacios", () => {
    expect(cleanTitle("Mi gran logro | Skool")).toBe("Mi gran logro");
    expect(cleanTitle("  Hito - Skool ")).toBe("Hito");
  });
  it("acota a 140 caracteres", () => {
    expect(cleanTitle("x".repeat(200)).length).toBeLessThanOrEqual(140);
  });
});

import { describe, it, expect } from "vitest";
import { renderBadgeSvg } from "@/lib/badge-svg";

describe("renderBadgeSvg", () => {
  it("incluye el nombre del producto cuando se pasa", () => {
    expect(renderBadgeSvg("FocusFlow", "dark")).toContain("FocusFlow");
  });

  it("usa el badge genérico de marca cuando el nombre es null", () => {
    const svg = renderBadgeSvg(null, "dark");
    expect(svg).toContain("Denveler");
    expect(svg).not.toContain("null");
  });

  it("escapa caracteres especiales del nombre del producto", () => {
    const svg = renderBadgeSvg('<script>alert("x")</script>', "dark");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("produce SVG válido (empieza y termina correctamente)", () => {
    const svg = renderBadgeSvg("Algo", "light");
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("cambia colores entre tema oscuro y claro", () => {
    const dark = renderBadgeSvg("Algo", "dark");
    const light = renderBadgeSvg("Algo", "light");
    expect(dark).not.toBe(light);
  });
});

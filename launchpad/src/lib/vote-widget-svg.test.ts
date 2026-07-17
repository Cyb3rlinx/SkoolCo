import { describe, it, expect } from "vitest";
import { renderVoteWidgetSvg } from "@/lib/vote-widget-svg";

describe("renderVoteWidgetSvg", () => {
  it("incluye el nombre del producto y el conteo de votos", () => {
    const svg = renderVoteWidgetSvg({ productName: "FocusFlow", voteCount: 42, theme: "dark" });
    expect(svg).toContain("FocusFlow");
    expect(svg).toContain("42");
  });

  it("escapa caracteres especiales del nombre", () => {
    const svg = renderVoteWidgetSvg({
      productName: '<script>alert(1)</script>',
      voteCount: 1,
      theme: "dark",
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("produce SVG válido", () => {
    const svg = renderVoteWidgetSvg({ productName: "Algo", voteCount: 0, theme: "light" });
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("cambia colores entre tema oscuro y claro", () => {
    const dark = renderVoteWidgetSvg({ productName: "Algo", voteCount: 3, theme: "dark" });
    const light = renderVoteWidgetSvg({ productName: "Algo", voteCount: 3, theme: "light" });
    expect(dark).not.toBe(light);
  });

  it("maneja 0 votos sin romper el singular/plural", () => {
    const svg = renderVoteWidgetSvg({ productName: "Algo", voteCount: 0, theme: "dark" });
    expect(svg).toContain("0 votos");
  });

  it("usa singular para exactamente 1 voto", () => {
    const svg = renderVoteWidgetSvg({ productName: "Algo", voteCount: 1, theme: "dark" });
    expect(svg).toContain("1 voto");
    expect(svg).not.toContain("1 votos");
  });
});

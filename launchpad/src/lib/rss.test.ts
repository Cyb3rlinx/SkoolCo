import { describe, it, expect } from "vitest";
import { renderLaunchesRss } from "@/lib/rss";

const ITEM = {
  name: "FocusFlow",
  tagline: "Deep-work timer",
  slug: "focusflow",
  launchDate: new Date("2026-07-10T12:00:00Z"),
};

describe("renderLaunchesRss", () => {
  it("produce XML válido con encabezado RSS 2.0", () => {
    const xml = renderLaunchesRss([ITEM], "https://denveler.com");
    expect(xml.trim().startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<rss version=\"2.0\"");
  });

  it("incluye un <item> por cada producto con link absoluto", () => {
    const xml = renderLaunchesRss([ITEM], "https://denveler.com");
    expect(xml).toContain("<title>FocusFlow</title>");
    expect(xml).toContain("<link>https://denveler.com/products/focusflow</link>");
  });

  it("escapa caracteres especiales en el título", () => {
    const xml = renderLaunchesRss(
      [{ ...ITEM, name: "A & B <script>" }],
      "https://denveler.com"
    );
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("A &amp; B &lt;script&gt;");
  });

  it("produce un feed vacío válido cuando no hay productos", () => {
    const xml = renderLaunchesRss([], "https://denveler.com");
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});

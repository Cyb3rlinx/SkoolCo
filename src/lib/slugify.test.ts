import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/validation";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips accents", () => {
    expect(slugify("Café Münchën")).toBe("cafe-munchen");
  });
  it("collapses non-alphanumerics and trims hyphens", () => {
    expect(slugify("  --Foo!!  Bar__  ")).toBe("foo-bar");
  });
  it("caps length at 80 chars", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

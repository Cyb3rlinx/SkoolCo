import { describe, it, expect } from "vitest";
import { detectPlatform } from "@/lib/platforms";

describe("detectPlatform", () => {
  it("detecta cada plataforma del allowlist", () => {
    expect(detectPlatform("https://www.skool.com/c/post")).toBe("skool");
    expect(detectPlatform("https://discord.com/channels/1/2/3")).toBe("discord");
    expect(detectPlatform("https://www.youtube.com/watch?v=abc")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/abc")).toBe("youtube");
    expect(detectPlatform("https://x.com/user/status/1")).toBe("x");
    expect(detectPlatform("https://twitter.com/user/status/1")).toBe("x");
    expect(detectPlatform("https://www.facebook.com/groups/g/posts/1")).toBe("facebook");
    expect(detectPlatform("https://www.linkedin.com/posts/abc")).toBe("linkedin");
    expect(detectPlatform("https://www.instagram.com/p/abc")).toBe("instagram");
    expect(detectPlatform("https://t.me/canal/123")).toBe("telegram");
    expect(detectPlatform("https://mi-comunidad.circle.so/c/post")).toBe("circle");
  });

  it("rechaza http, dominios ajenos, sufijos falsos y basura", () => {
    expect(detectPlatform("http://www.skool.com/c/post")).toBeNull();
    expect(detectPlatform("https://evil.com/skool.com/post")).toBeNull();
    expect(detectPlatform("https://notskool.com/c/post")).toBeNull();
    expect(detectPlatform("https://skool.com.evil.com/x")).toBeNull();
    expect(detectPlatform("no-es-url")).toBeNull();
  });
});

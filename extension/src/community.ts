// Importa la ÚNICA fuente de verdad del allowlist desde el backend
// (módulo puro, sin dependencias — esbuild lo bundlea sin problema).
import { PLATFORMS, detectPlatform } from "../../src/lib/platforms";

const RESERVED_FIRST_SEGMENTS = new Set([
  "login",
  "signup",
  "signin",
  "pricing",
  "about",
  "legal",
  "privacy",
  "terms",
  "help",
  "support",
  "settings",
  "discovery",
]);

/**
 * Heurística de UX: ¿la URL parece un post/página de comunidad compartible?
 * (plataforma del allowlist + no es la homepage + no es una ruta reservada).
 * El backend revalida con el mismo allowlist; un moderador verifica después.
 */
export function isCommunityPostUrl(raw: string): boolean {
  if (detectPlatform(raw) === null) return false;
  try {
    const u = new URL(raw);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return false; // homepage de la plataforma
    return !RESERVED_FIRST_SEGMENTS.has(segs[0].toLowerCase());
  } catch {
    return false;
  }
}

// "Mi logro | Skool", "Mi video - YouTube", etc.
const LABEL_SUFFIX = new RegExp(
  `\\s*[|\\-–—]\\s*(${PLATFORMS.map((p) => p.label).join("|")})\\s*$`,
  "i"
);

/** Limpia el título de pestaña para usarlo como título del logro. */
export function cleanTitle(raw: string): string {
  let t = raw.replace(LABEL_SUFFIX, "").trim();
  if (t.length > 140) t = t.slice(0, 137).trimEnd() + "…";
  return t;
}

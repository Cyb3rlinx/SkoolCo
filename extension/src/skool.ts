const RESERVED = new Set(["login", "signup", "pricing", "about", "legal", "support", "discovery"]);

/** Heurística de UX: ¿la URL parece un post público de Skool? (el backend revalida) */
export function isSkoolPostUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    if (host !== "skool.com" && !host.endsWith(".skool.com")) return false;
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length < 2) return false;
    return !RESERVED.has(segs[0].toLowerCase());
  } catch {
    return false;
  }
}

/** Limpia el título de pestaña de Skool para usarlo como título del logro. */
export function cleanTitle(raw: string): string {
  let t = raw.replace(/\s*[|\-–—]\s*Skool\s*$/i, "").trim();
  if (t.length > 140) t = t.slice(0, 137).trimEnd() + "…";
  return t;
}

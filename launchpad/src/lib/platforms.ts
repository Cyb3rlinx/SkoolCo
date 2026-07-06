/**
 * Allowlist de plataformas de comunidad aceptadas para community-links.
 *
 * ÚNICA FUENTE DE VERDAD: la consumen el backend (validación Zod en
 * validation.ts) y la extensión Chrome (extension/src/community.ts la
 * importa y esbuild la bundlea). Por eso este módulo debe permanecer
 * PURO — sin dependencias ni imports de servidor.
 */
export interface Platform {
  /** Se guarda en CommunityLink.sourcePlatform */
  id: string;
  /** Nombre visible (también usado para limpiar títulos de pestaña) */
  label: string;
  /** Hosts aceptados: match exacto o subdominio (sufijo) */
  hosts: string[];
}

export const PLATFORMS: Platform[] = [
  { id: "skool", label: "Skool", hosts: ["skool.com"] },
  { id: "discord", label: "Discord", hosts: ["discord.com"] },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "x", label: "X", hosts: ["x.com", "twitter.com"] },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com"] },
  { id: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"] },
  { id: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { id: "telegram", label: "Telegram", hosts: ["t.me"] },
  { id: "circle", label: "Circle", hosts: ["circle.so"] },
];

function hostMatches(hostname: string, allowed: string): boolean {
  return hostname === allowed || hostname.endsWith("." + allowed);
}

/**
 * Devuelve el id de la plataforma si la URL es https y su host está en el
 * allowlist; null en cualquier otro caso (http, dominio ajeno, URL inválida).
 */
export function detectPlatform(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    for (const p of PLATFORMS) {
      if (p.hosts.some((h) => hostMatches(u.hostname, h))) return p.id;
    }
    return null;
  } catch {
    return null;
  }
}

import { slugify } from "@/lib/validation";

/** Nombres bloqueados incluso para auto-generación y edición manual. */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "denveler",
  "api",
  "willy",
  "kevin",
  "soporte",
  "moderador",
  "null",
  "undefined",
]);

/** Pure: convierte un nombre de perfil en un username base (sin chequear unicidad). */
export function baseUsername(name: string): string {
  const slug = slugify(name).slice(0, 20).replace(/-+$/, "");
  const base = slug.length >= 3 ? slug : `usuario-${Math.abs(hashCode(name)) % 10000}`.slice(0, 20);
  return RESERVED_USERNAMES.has(base) ? `${base}-1` : base;
}

/** Pure: dado un base y el set de usernames ya tomados, devuelve la primera variante libre. */
export function resolveUsername(base: string, taken: Set<string>): string {
  if (!taken.has(base) && !RESERVED_USERNAMES.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`) || RESERVED_USERNAMES.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

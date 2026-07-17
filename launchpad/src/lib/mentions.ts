/** Extrae hasta 5 @usernames con sintaxis válida de un texto, sin duplicados, en orden de aparición. */
export function extractMentions(body: string): string[] {
  const matches = body.match(/@([a-z0-9-]{3,30})\b/gi) ?? [];
  const unique = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  return unique.slice(0, 5);
}

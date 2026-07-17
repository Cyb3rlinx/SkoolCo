const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const THEMES = {
  dark: { bg: "#001B4D", fg: "#ffffff", accent: "#22d3ee" },
  light: { bg: "#ffffff", fg: "#001B4D", accent: "#2563eb" },
} as const;

/**
 * Pure: genera el SVG del widget "Vótame en Denveler" — muestra el conteo de
 * votos en vivo y un llamado a la acción. Al hacer clic (link del <a> que lo
 * envuelve) lleva al producto en Denveler para votar — no vota en el sitio
 * del maker directamente: eso requeriría exponer auth/CSRF cross-origin en
 * un iframe de terceros, un riesgo de seguridad que no vale la pena para un
 * botón de voto.
 */
export function renderVoteWidgetSvg(params: {
  productName: string;
  voteCount: number;
  theme: "dark" | "light";
}): string {
  const t = THEMES[params.theme];
  const label = esc(params.productName);
  const voteLabel = `${params.voteCount} ${params.voteCount === 1 ? "voto" : "votos"}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="72" viewBox="0 0 240 72">
  <rect width="240" height="72" rx="10" fill="${t.bg}" stroke="${t.accent}" stroke-width="1"/>
  <text x="16" y="26" font-family="sans-serif" font-size="12" fill="${t.fg}" opacity="0.7">Vótame en Denveler</text>
  <text x="16" y="46" font-family="sans-serif" font-size="15" font-weight="700" fill="${t.fg}">${label}</text>
  <text x="16" y="63" font-family="sans-serif" font-size="12" fill="${t.accent}" font-weight="700">▲ ${voteLabel}</text>
</svg>`;
}

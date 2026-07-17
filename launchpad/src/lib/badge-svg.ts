const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const THEMES = {
  dark: { bg: "#001B4D", fg: "#ffffff", accent: "#22d3ee" },
  light: { bg: "#ffffff", fg: "#001B4D", accent: "#2563eb" },
} as const;

/** Pure: genera el SVG del badge embebible. `productName` null = badge genérico de marca. */
export function renderBadgeSvg(productName: string | null, theme: "dark" | "light"): string {
  const t = THEMES[theme];
  const label = productName ? esc(productName) : "Denveler";
  const sub = productName ? "Lanzado en Denveler" : "denveler.com";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="54" viewBox="0 0 220 54">
  <rect width="220" height="54" rx="8" fill="${t.bg}" stroke="${t.accent}" stroke-width="1"/>
  <rect x="10" y="14" width="26" height="26" rx="7" fill="${t.accent}"/>
  <text x="46" y="26" font-family="sans-serif" font-size="14" font-weight="700" fill="${t.fg}">${label}</text>
  <text x="46" y="42" font-family="sans-serif" font-size="11" fill="${t.fg}" opacity="0.7">${sub}</text>
</svg>`;
}

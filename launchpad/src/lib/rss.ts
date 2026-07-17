const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface LaunchRssItem {
  name: string;
  tagline: string;
  slug: string;
  launchDate: Date;
}

/** Pure: genera el XML del feed RSS 2.0 de lanzamientos LIVE recientes. */
export function renderLaunchesRss(items: LaunchRssItem[], siteUrl: string): string {
  const itemsXml = items
    .map(
      (p) => `  <item>
    <title>${esc(p.name)}</title>
    <link>${siteUrl}/products/${esc(p.slug)}</link>
    <guid>${siteUrl}/products/${esc(p.slug)}</guid>
    <description>${esc(p.tagline)}</description>
    <pubDate>${p.launchDate.toUTCString()}</pubDate>
  </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Denveler — Lanzamientos</title>
  <link>${siteUrl}/launches</link>
  <description>Últimos productos lanzados por la comunidad de Denveler.</description>
${itemsXml}
</channel>
</rss>`;
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { renderLaunchesRss } from "@/lib/rss";

/**
 * GET /api/feed.rss — feed RSS 2.0 público de los últimos 30 lanzamientos
 * LIVE. Sin auth. Cache corto (5 min) — no necesita estar al segundo.
 */
export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "LIVE" },
    orderBy: { launchDate: "desc" },
    take: 30,
    select: { name: true, tagline: true, slug: true, launchDate: true },
  });

  const siteUrl = process.env.NEXTAUTH_URL ?? "https://denveler.com";
  const xml = renderLaunchesRss(products, siteUrl);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

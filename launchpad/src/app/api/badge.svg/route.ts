export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { renderBadgeSvg } from "@/lib/badge-svg";

/**
 * GET /api/badge.svg?product=<slug>&theme=dark|light — badge embebible
 * estático. Si el producto no existe o no está LIVE, devuelve el badge
 * genérico de marca (nunca 404 — evita un ícono roto en el sitio del maker).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("product");
  const theme = url.searchParams.get("theme") === "light" ? "light" : "dark";

  let productName: string | null = null;
  if (slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { name: true, status: true },
    });
    if (product?.status === "LIVE") productName = product.name;
  }

  const svg = renderBadgeSvg(productName, theme);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

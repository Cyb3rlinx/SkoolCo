export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { renderVoteWidgetSvg } from "@/lib/vote-widget-svg";

/**
 * GET /api/vote-widget.svg?product=<slug>&theme=dark|light — widget embebible
 * con el conteo de votos en vivo. Si el producto no existe o no está LIVE,
 * devuelve un widget genérico de marca (nunca 404 — evita un ícono roto).
 * Cache corto (60s) porque el conteo cambia, a diferencia del badge estático.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("product");
  const theme = url.searchParams.get("theme") === "light" ? "light" : "dark";

  let productName = "Denveler";
  let voteCount = 0;
  if (slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { name: true, status: true, _count: { select: { upvotes: true } } },
    });
    if (product?.status === "LIVE") {
      productName = product.name;
      voteCount = product._count.upvotes;
    }
  }

  const svg = renderVoteWidgetSvg({ productName, voteCount, theme });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

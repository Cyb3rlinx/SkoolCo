import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// Prisma needs Node (not edge), and the image must reflect current votes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = "Lanzamiento en LaunchPad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card for a product (og:image / twitter:image).
 * Brand-gradient canvas with name, tagline, category and votes — no remote
 * assets, so it renders fast and never breaks on missing logos.
 */
export default async function OgImage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      tagline: true,
      status: true,
      category: { select: { name: true } },
      maker: { select: { name: true } },
      _count: { select: { upvotes: true } },
    },
  });

  const live = product && product.status === "LIVE";
  const name = live ? product.name : "LaunchPad";
  const tagline = live
    ? product.tagline
    : "La plataforma de lanzamientos impulsada por la comunidad";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundImage: "linear-gradient(120deg, #32128A 0%, #5B2CFF 70%, #6D3DFF 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(255,255,255,0.18)",
              fontSize: 32,
            }}
          >
            🚀
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>LaunchPad</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>
            {name.slice(0, 40)}
          </div>
          <div style={{ fontSize: 36, opacity: 0.85, lineHeight: 1.3 }}>
            {tagline.slice(0, 90)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28 }}>
          {live && (
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                fontWeight: 700,
              }}
            >
              {product.category.name}
            </div>
          )}
          {live && (
            <div style={{ display: "flex", fontWeight: 700 }}>
              {product._count.upvotes} votos
            </div>
          )}
          {live && <div style={{ display: "flex", opacity: 0.8 }}>por {product.maker.name}</div>}
        </div>
      </div>
    ),
    size
  );
}

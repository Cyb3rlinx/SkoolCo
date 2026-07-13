import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// Prisma needs Node (not edge), and the image must reflect current votes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = "Lanzamiento en Denveler";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Denveler mark, inlined as a data URI — Satori (next/og) can't fetch /public
// at render time, and a 32x32 badge keeps the payload tiny.
const MARK_DATA_URI =
  "data:image/png;base64,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";

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
  const name = live ? product.name : "Denveler";
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
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori needs a plain <img> */}
            <img src={MARK_DATA_URI} width={36} height={36} alt="" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>Denveler</div>
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

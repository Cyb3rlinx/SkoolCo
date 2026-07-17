import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Denveler — lanza tu producto con la comunidad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Tarjeta social del sitio — usada por cualquier página sin OG propio (home, footer pages, etc). */
export default async function OgImage() {
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
          backgroundImage: "linear-gradient(120deg, #001B4D 0%, #004AAD 70%, #0064D6 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #22d3ee, #2563eb)",
            }}
          />
          <div style={{ fontSize: 36, fontWeight: 800 }}>denveler</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
            Lanza tu producto con la comunidad
          </div>
          <div style={{ fontSize: 34, opacity: 0.85, lineHeight: 1.3 }}>
            Publica tu proyecto, recibe votos y feedback real, y gana visibilidad.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
              fontWeight: 700,
            }}
          >
            denveler.com
          </div>
        </div>
      </div>
    ),
    size
  );
}

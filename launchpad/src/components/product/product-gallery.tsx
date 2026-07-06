/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { cn, tileGradient } from "@/lib/frontend/utils";
import { ProductLogo } from "./product-logo";

/**
 * Detail-page gallery.
 *
 * The API only stores `logoUrl` today, so the gallery renders a branded
 * hero panel plus stylized placeholder frames.
 * TODO(backend): add a product media/screenshots endpoint
 * (e.g. GET /api/products/:slug/media) and replace the placeholder frames
 * with real uploads.
 */
export function ProductGallery({ name, logoUrl, tagline }: { name: string; logoUrl: string | null; tagline: string }) {
  const [active, setActive] = useState(0);
  const gradient = tileGradient(name);

  const frames = [0, 1, 2];

  return (
    <div className="space-y-3">
      {/* Hero panel */}
      <div
        className="relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-2xl border"
        style={{ backgroundImage: gradient }}
        role="img"
        aria-label={`Vista previa de ${name}`}
      >
        {/* Soft texture */}
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_25%_20%,white_0,transparent_45%),radial-gradient(circle_at_80%_75%,white_0,transparent_40%)]" />

        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-24 w-24 rounded-2xl border-2 border-white/40 object-cover shadow-lift" />
        ) : (
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            <ProductLogo name={name} src={null} size="lg" className="border-2 border-white/40" />
            <p className="max-w-md text-sm font-semibold text-white/90 drop-shadow">{tagline}</p>
          </div>
        )}

        <span className="absolute bottom-3 right-3 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          Vista previa {active + 1} / {frames.length}
        </span>
      </div>

      {/* Thumbnails (placeholders until real screenshots exist) */}
      <div className="grid grid-cols-3 gap-3" role="tablist" aria-label="Miniaturas de la galería">
        {frames.map((i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={`Vista previa ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "relative aspect-[16/9] overflow-hidden rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === i ? "border-primary ring-2 ring-primary/30" : "opacity-70 hover:opacity-100"
            )}
            style={{ backgroundImage: gradient }}
          >
            <span
              className="absolute inset-0"
              style={{ opacity: 0.35 + i * 0.25, backgroundColor: "rgb(255 255 255 / 0.25)" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

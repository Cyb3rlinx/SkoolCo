/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  ApiClientError,
  addProductImage,
  deleteProductImage,
  uploadImage,
} from "@/lib/frontend/api-client";
import { cn, tileGradient } from "@/lib/frontend/utils";
import type { ProductImage } from "@/lib/frontend/types";
import { ProductLogo } from "./product-logo";

const MAX_IMAGES = 5;

/**
 * Detail-page gallery.
 *
 * With real screenshots (product.images) it renders them; otherwise it falls
 * back to the branded hero panel. The maker (or staff) can add up to 5
 * screenshots — file → POST /api/uploads → POST /api/products/:slug/images —
 * and remove them, right from this component.
 */
export function ProductGallery({
  name,
  logoUrl,
  tagline,
  slug,
  makerId,
  images = [],
  onChanged,
}: {
  name: string;
  logoUrl: string | null;
  tagline: string;
  slug: string;
  makerId: string;
  images?: ProductImage[];
  onChanged?: () => void;
}) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const gradient = tileGradient(name);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit =
    session?.user?.id === makerId || role === "ADMIN" || role === "MODERATOR";

  const hasImages = images.length > 0;
  const current = hasImages ? images[Math.min(active, images.length - 1)] : null;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Usa PNG, JPG o WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Máximo 2MB por imagen.");
      return;
    }

    setBusy(true);
    try {
      const { url } = await uploadImage(file);
      await addProductImage(slug, url);
      setActive(images.length); // focus the newly added frame after refetch
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No pudimos subir la imagen.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onDelete(imageId: string) {
    setError(null);
    setBusy(true);
    try {
      await deleteProductImage(slug, imageId);
      setActive(0);
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No pudimos borrar la imagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Hero panel */}
      <div
        className="relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-2xl border bg-muted"
        style={current ? undefined : { backgroundImage: gradient }}
        role="img"
        aria-label={`Vista previa de ${name}`}
      >
        {current ? (
          <img src={current.url} alt={`Captura de ${name}`} className="h-full w-full object-contain" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_25%_20%,white_0,transparent_45%),radial-gradient(circle_at_80%_75%,white_0,transparent_40%)]" />
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-24 w-24 rounded-2xl border-2 border-white/40 object-cover shadow-lift" />
            ) : (
              <div className="relative flex flex-col items-center gap-3 px-6 text-center">
                <ProductLogo name={name} src={null} size="lg" className="border-2 border-white/40" />
                <p className="max-w-md text-sm font-semibold text-white/90 drop-shadow">{tagline}</p>
              </div>
            )}
          </>
        )}

        {hasImages && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {Math.min(active + 1, images.length)} / {images.length}
          </span>
        )}

        {canEdit && current && (
          <button
            type="button"
            onClick={() => onDelete(current.id)}
            disabled={busy}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-destructive disabled:opacity-50"
            aria-label="Borrar esta captura"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Thumbnails + add button */}
      {(hasImages || canEdit) && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" role="tablist" aria-label="Miniaturas de la galería">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Vista previa ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === i ? "border-primary ring-2 ring-primary/30" : "opacity-70 hover:opacity-100"
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}

          {canEdit && images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex aspect-[16/9] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"
              aria-label="Agregar captura"
              aria-busy={busy}
            >
              {busy ? (
                <span className="text-[10px] font-semibold">Subiendo…</span>
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  <span className="text-[10px] font-semibold">Agregar foto</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {canEdit && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={onPickFile}
          aria-hidden
          tabIndex={-1}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

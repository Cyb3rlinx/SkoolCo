"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { ImagePlus } from "lucide-react";
import { ApiClientError, updateProduct, uploadImage } from "@/lib/frontend/api-client";
import { Button } from "@/components/ui/button";

/**
 * Maker-only affordance to change a product's logo from its detail page:
 * picks a file → POST /api/uploads → PATCH /api/products/:slug { logoUrl }.
 * Renders nothing for visitors who can't edit the product (the API enforces
 * the real permission check either way).
 */
export function ChangeLogoButton({
  slug,
  makerId,
  onUpdated,
}: {
  slug: string;
  makerId: string;
  onUpdated: () => void;
}) {
  const t = useTranslations("product.changeLogo");
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit =
    session?.user?.id === makerId || role === "ADMIN" || role === "MODERATOR";
  if (!canEdit) return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(t("errorFileType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("errorFileSize"));
      return;
    }

    setBusy(true);
    try {
      const { url } = await uploadImage(file);
      await updateProduct(slug, { logoUrl: url });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errorUpdate"));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-busy={busy}
      >
        <ImagePlus className="h-3.5 w-3.5" aria-hidden />
        {busy ? t("uploading") : t("cta")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={onPick}
        aria-hidden
        tabIndex={-1}
      />
      {error && <p className="max-w-[9rem] text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}

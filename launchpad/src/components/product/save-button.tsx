"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";
import { saveProduct, unsaveProduct } from "@/lib/frontend/api-client";
import { cn } from "@/lib/frontend/utils";

interface SaveButtonProps {
  slug: string;
  saved?: boolean;
  className?: string;
}

/**
 * Favoritos toggle with optimistic UI.
 * API: POST/DELETE /api/products/:slug/save (idempotent on the backend).
 * Signed-out users are sent to /login preserving where they were.
 */
export function SaveButton({ slug, saved = false, className }: SaveButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSaved, setIsSaved] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;

    const prev = isSaved;
    setIsSaved(!prev);
    setBusy(true);

    try {
      const result = prev ? await unsaveProduct(slug) : await saveProduct(slug);
      setIsSaved(result.saved);
    } catch {
      setIsSaved(prev); // rollback
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Quitar de guardados" : "Guardar en favoritos"}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSaved
          ? "border-primary/40 bg-accent text-primary"
          : "bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
        className
      )}
    >
      <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} aria-hidden />
    </button>
  );
}

"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronUp } from "lucide-react";
import { removeUpvote, upvoteProduct } from "@/lib/frontend/api-client";
import { cn } from "@/lib/frontend/utils";
import { compactNumber } from "@/lib/frontend/format";

interface UpvoteButtonProps {
  slug: string;
  count: number;
  upvoted?: boolean;
  /** compact = card column; large = detail page hero. */
  variant?: "compact" | "large";
  /** Notify parent (e.g. product detail keeps its own count in sync). */
  onChange?: (result: { upvoted: boolean; upvoteCount: number }) => void;
  className?: string;
}

/**
 * Upvote toggle with optimistic UI.
 * API: POST/DELETE /api/products/:slug/upvote (idempotent on the backend).
 * Signed-out users are sent to /login preserving where they were.
 */
export function UpvoteButton({
  slug,
  count,
  upvoted = false,
  variant = "compact",
  onChange,
  className,
}: UpvoteButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ count, upvoted });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle(e: React.MouseEvent) {
    // The button often lives inside a card whose surface is a link.
    e.preventDefault();
    e.stopPropagation();

    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;

    const prev = state;
    const optimistic = {
      upvoted: !prev.upvoted,
      count: prev.count + (prev.upvoted ? -1 : 1),
    };
    setState(optimistic);
    setFailed(false);
    setBusy(true);

    try {
      const result = prev.upvoted ? await removeUpvote(slug) : await upvoteProduct(slug);
      setState({ count: result.upvoteCount, upvoted: result.upvoted });
      onChange?.(result);
    } catch {
      setState(prev); // rollback
      setFailed(true);
      setTimeout(() => setFailed(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  const base =
    "group flex select-none flex-col items-center justify-center border font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const look = state.upvoted
    ? "border-primary/40 bg-accent text-primary"
    : "bg-card text-foreground hover:border-primary/40 hover:text-primary";
  const shake = failed ? "border-destructive/60 text-destructive" : "";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.upvoted}
      aria-label={`${state.upvoted ? "Quitar voto de" : "Votar"} este producto (${state.count} votos)`}
      title={failed ? "No se pudo guardar tu voto — ¿API disponible?" : undefined}
      className={cn(
        base,
        look,
        shake,
        variant === "compact" ? "h-14 w-12 rounded-xl text-sm" : "h-20 w-16 rounded-2xl text-lg",
        className
      )}
    >
      <ChevronUp
        className={cn(
          "transition-transform group-hover:-translate-y-0.5",
          state.upvoted && "animate-pop",
          variant === "compact" ? "h-4 w-4" : "h-6 w-6"
        )}
        aria-hidden
      />
      {compactNumber(state.count)}
    </button>
  );
}

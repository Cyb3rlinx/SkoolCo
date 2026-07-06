/* eslint-disable @next/next/no-img-element */
import { cn, initials, tileGradient } from "@/lib/frontend/utils";

const SIZES = {
  sm: "h-10 w-10 rounded-lg text-sm",
  md: "h-14 w-14 rounded-xl text-lg",
  lg: "h-20 w-20 rounded-2xl text-2xl",
};

/**
 * Product thumbnail. `logoUrl` is nullable in the API, so the fallback —
 * initials over a per-product gradient — is a first-class visual, not an
 * error state.
 */
export function ProductLogo({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={`Logo de ${name}`}
        loading="lazy"
        className={cn("shrink-0 border object-cover", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-extrabold text-white shadow-soft",
        SIZES[size],
        className
      )}
      style={{ backgroundImage: tileGradient(name) }}
    >
      {initials(name)}
    </span>
  );
}

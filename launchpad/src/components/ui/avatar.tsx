/* eslint-disable @next/next/no-img-element */
import { cn, initials, tileGradient } from "@/lib/frontend/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

/**
 * Avatar with graceful fallback: when there is no image URL (the common case
 * — the API allows avatarUrl to be null) it renders initials on a gradient
 * tile derived from the name, so every user gets a stable identity color.
 */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn("rounded-full object-cover", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white",
        SIZES[size],
        className
      )}
      style={{ backgroundImage: tileGradient(name) }}
    >
      {initials(name)}
    </span>
  );
}

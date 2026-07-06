import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution (shadcn-style `cn`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic gradient for logo/avatar placeholder tiles, so entities
 * without an uploaded image still get a stable, distinctive color.
 */
const TILE_GRADIENTS = [
  "linear-gradient(135deg, #7c3aed, #4f46e5)",
  "linear-gradient(135deg, #0ea5e9, #6366f1)",
  "linear-gradient(135deg, #059669, #14b8a6)",
  "linear-gradient(135deg, #d97706, #f59e0b)",
  "linear-gradient(135deg, #db2777, #a855f7)",
  "linear-gradient(135deg, #dc2626, #ea580c)",
  "linear-gradient(135deg, #0891b2, #2dd4bf)",
  "linear-gradient(135deg, #4f46e5, #0ea5e9)",
];

export function tileGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TILE_GRADIENTS[hash % TILE_GRADIENTS.length];
}

/** First letters of up to two words: "Ana Maker" → "AM". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

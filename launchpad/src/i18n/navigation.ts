import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware wrappers around Next.js navigation APIs. Use these instead of
 * `next/link` / `next/navigation` in any component under `src/app/[locale]`
 * so links and redirects automatically carry the current locale prefix.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

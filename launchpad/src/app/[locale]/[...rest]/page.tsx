import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched paths under a locale prefix (e.g. `/en/typo`).
 * Without this, Next.js can't tell the `[locale]` segment matched at all for
 * a fully unknown path, so it renders the generic built-in 404 instead of
 * our localized `src/app/[locale]/not-found.tsx`. This route exists only to
 * trigger that boundary.
 */
export default function CatchAll() {
  notFound();
}

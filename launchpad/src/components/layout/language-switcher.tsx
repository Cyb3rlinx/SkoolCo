"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useClickOutside } from "@/lib/frontend/use-click-outside";
import { cn } from "@/lib/frontend/utils";

const LOCALE_LABELS: Record<string, string> = {
  es: "ES",
  en: "EN",
  zh: "中文",
};

function LanguageSwitcherInner({ className }: { className?: string }) {
  const t = useTranslations("common");
  const activeLocale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, useCallback(() => setOpen(false), []));

  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("language")}
        aria-expanded={open}
        className="flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
        {LOCALE_LABELS[activeLocale] ?? activeLocale}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-32 overflow-hidden rounded-2xl border bg-card py-1 shadow-lift">
          {routing.locales.map((locale) => (
            <Link
              key={locale}
              href={href}
              locale={locale}
              onClick={() => setOpen(false)}
              aria-current={locale === activeLocale ? "true" : undefined}
              className={cn(
                "block px-4 py-2 text-sm font-medium transition-colors",
                locale === activeLocale
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {LOCALE_LABELS[locale] ?? locale}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Locale switcher: compact icon+code trigger that opens a dropdown, matching
 * the NotificationsBell/UserMenu pattern — keeps the header's right-side
 * cluster narrow next to the avatar instead of a 3-link pill. Keeps the
 * current path (and query string), only changes the locale prefix. Hidden
 * on `/admin`, which is out of the i18n setup.
 *
 * Wrapped in Suspense because it reads `useSearchParams()`: the header
 * (and this component with it) renders in the root `[locale]` layout,
 * which has no Suspense boundary of its own, so without this every page
 * would fail static prerendering ("missing-suspense-with-csr-bailout").
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<div className={cn("h-10 w-14 rounded-lg", className)} aria-hidden />}>
      <LanguageSwitcherInner className={className} />
    </Suspense>
  );
}

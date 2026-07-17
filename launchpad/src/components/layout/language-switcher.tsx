"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
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
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <div
      className={cn("flex items-center gap-0.5 rounded-lg border bg-card p-0.5", className)}
      aria-label={t("language")}
    >
      <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={href}
          locale={locale}
          aria-current={locale === activeLocale ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
            locale === activeLocale
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {LOCALE_LABELS[locale] ?? locale}
        </Link>
      ))}
    </div>
  );
}

/**
 * Locale switcher: keeps the current path (and query string) and only
 * changes the locale prefix. Rendered in the site header for every
 * `[locale]` page — hidden on `/admin`, which is out of the i18n setup.
 *
 * Wrapped in Suspense because it reads `useSearchParams()`: the header
 * (and this component with it) renders in the root `[locale]` layout,
 * which has no Suspense boundary of its own, so without this every page
 * would fail static prerendering ("missing-suspense-with-csr-bailout").
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<div className={cn("h-8 w-24 rounded-lg border bg-card", className)} aria-hidden />}>
      <LanguageSwitcherInner className={className} />
    </Suspense>
  );
}

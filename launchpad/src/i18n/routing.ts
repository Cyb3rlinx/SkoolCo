import { defineRouting } from "next-intl/routing";

/**
 * i18n routing config. Spanish (`es`) is the default locale and is served
 * unprefixed (`/launches`); English and Chinese live under `/en/...` and
 * `/zh/...` (`localePrefix: "as-needed"`).
 */
export const routing = defineRouting({
  locales: ["es", "en", "zh"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

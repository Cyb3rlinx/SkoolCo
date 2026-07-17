/** Date/number formatting helpers. Default to `es` for backward compat with
 * call sites that don't pass a locale (e.g. the admin panel, out of scope
 * for i18n); pass the current locale (from `useLocale()`) anywhere the UI
 * is translated. */

const BCP47: Record<string, string> = { zh: "zh-CN" };
const toBcp47 = (locale: string) => BCP47[locale] ?? locale;

export function formatDate(value: string | Date, locale: string = "es"): string {
  return new Intl.DateTimeFormat(toBcp47(locale), { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(value)
  );
}

export function formatShortDate(value: string | Date, locale: string = "es"): string {
  return new Intl.DateTimeFormat(toBcp47(locale), { day: "numeric", month: "short" }).format(new Date(value));
}

export function isToday(value: string | Date): boolean {
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isFuture(value: string | Date): boolean {
  return new Date(value).getTime() > Date.now();
}

/** "hace 3 h", "3 hours ago", "3小时前"… */
export function timeAgo(value: string | Date, locale: string = "es"): string {
  const rtf = new Intl.RelativeTimeFormat(toBcp47(locale), { numeric: "auto" });
  const diffMs = new Date(value).getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(value, locale);
}

export function compactNumber(n: number, locale: string = "es"): string {
  return new Intl.NumberFormat(toBcp47(locale), { notation: "compact" }).format(n);
}

/** yyyy-MM-dd for <input type="date"> values. */
export function toDateInputValue(value: string | Date): string {
  const d = new Date(value);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

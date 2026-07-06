/** Date/number formatting helpers (es-locale UI). */

const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value));
}

export function formatShortDate(value: string | Date): string {
  return shortDateFmt.format(new Date(value));
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

/** "hace 3 h", "hace 2 días", "ayer"… */
export function timeAgo(value: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const diffMs = new Date(value).getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(value);
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("es", { notation: "compact" }).format(n);
}

/** yyyy-MM-dd for <input type="date"> values. */
export function toDateInputValue(value: string | Date): string {
  const d = new Date(value);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

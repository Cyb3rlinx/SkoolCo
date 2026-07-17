/** Pure: dado "ahora", devuelve el rango [start, end) del mes calendario ANTERIOR en UTC. */
export function previousCalendarMonthRange(now: Date): { start: Date; end: Date } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { start, end };
}

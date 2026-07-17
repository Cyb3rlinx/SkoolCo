/** Pure: instante `hours` horas antes de `now` — el arranque de la ventana "reciente". */
export function recentWindowStart(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

/** Ventana usada por el sort "trending": votos de las últimas 24 horas. */
export const TRENDING_WINDOW_HOURS = 24;

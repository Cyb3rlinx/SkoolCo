const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Pure: buckets `dates` into UTC-day counts for the `days` days ending on
 * `now` (inclusive), oldest first. Dates outside the window are ignored.
 */
export function bucketByDay(
  dates: Date[],
  days: number,
  now: Date
): { date: string; count: number }[] {
  const todayKey = toDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00.000Z`).getTime();

  const buckets: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    buckets.push({ date: toDateKey(new Date(todayStart - i * DAY_MS)), count: 0 });
  }

  const index = new Map(buckets.map((b, i) => [b.date, i]));
  for (const d of dates) {
    const key = toDateKey(d);
    const i = index.get(key);
    if (i !== undefined) buckets[i].count++;
  }

  return buckets;
}

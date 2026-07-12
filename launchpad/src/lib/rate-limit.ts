/**
 * Lightweight sliding-window rate limiter.
 *
 * In-memory: correct for a single Node server (the default `next start`).
 * If you deploy serverless/multi-instance (e.g. Vercel), swap the Map for a
 * shared store — Upstash Redis (`@upstash/ratelimit`) is a drop-in choice.
 * The call sites won't need to change; only this module.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

// Prevent unbounded memory growth.
const MAX_BUCKETS = 50_000;

export interface RateLimitRule {
  /** Max actions allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const RATE_LIMITS = {
  upvote: { limit: 30, windowMs: 60_000 }, // 30 upvote toggles / minute
  comment: { limit: 10, windowMs: 60_000 }, // 10 comments / minute
  productCreate: { limit: 5, windowMs: 60 * 60_000 }, // 5 launches / hour
  report: { limit: 10, windowMs: 60 * 60_000 }, // 10 reports / hour
  communityLink: { limit: 10, windowMs: 60 * 60_000 }, // 10 link submissions / hour
  register: { limit: 5, windowMs: 60 * 60_000 }, // 5 signups / hour / IP
  extensionEvent: { limit: 60, windowMs: 60_000 }, // 60 events / minute
  upload: { limit: 20, windowMs: 60 * 60_000 }, // 20 image uploads / hour
  login: { limit: 5, windowMs: 15 * 60_000 }, // 5 login attempts / 15 min (per email and per IP)
  resendVerification: { limit: 3, windowMs: 15 * 60_000 }, // 3 resends / 15 min / IP
} satisfies Record<string, RateLimitRule>;

/**
 * Returns true if the action is allowed, false if rate-limited.
 * `key` should combine the action and actor, e.g. `upvote:${userId}`.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear(); // crude eviction
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < rule.windowMs);

  if (bucket.timestamps.length >= rule.limit) return false;

  bucket.timestamps.push(now);
  return true;
}

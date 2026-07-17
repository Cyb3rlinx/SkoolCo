/**
 * Lightweight rate limiter with two backends, picked by environment:
 *
 * - **Upstash Redis** (serverless/multi-instance, e.g. Vercel): set
 *   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` and limits are
 *   enforced across ALL instances (fixed window via INCR+PEXPIRE, one REST
 *   round-trip, no SDK dependency).
 * - **In-memory sliding window** (single Node server / dev / tests): the
 *   default when those env vars are absent.
 *
 * Fail-open: if Redis errors, the request is allowed — an outage of the
 * limiter must not take down login/signup with it.
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
  save: { limit: 30, windowMs: 60_000 }, // 30 save toggles / minute
  comment: { limit: 10, windowMs: 60_000 }, // 10 comments / minute
  productUpdate: { limit: 10, windowMs: 60 * 60_000 }, // 10 updates de bitácora / hora / maker
  productCreate: { limit: 5, windowMs: 60 * 60_000 }, // 5 launches / hour
  report: { limit: 10, windowMs: 60 * 60_000 }, // 10 reports / hour
  communityLink: { limit: 10, windowMs: 60 * 60_000 }, // 10 link submissions / hour
  register: { limit: 5, windowMs: 60 * 60_000 }, // 5 signups / hour / IP
  extensionEvent: { limit: 60, windowMs: 60_000 }, // 60 events / minute
  upload: { limit: 20, windowMs: 60 * 60_000 }, // 20 image uploads / hour
  contactRequest: { limit: 5, windowMs: 24 * 60 * 60_000 }, // 5 solicitudes de contacto / día / usuario
  contactForm: { limit: 3, windowMs: 60 * 60_000 }, // 3 mensajes de contacto / hora / IP
  login: { limit: 5, windowMs: 15 * 60_000 }, // 5 login attempts / 15 min (per email and per IP)
  resendVerification: { limit: 3, windowMs: 15 * 60_000 }, // 3 resends / 15 min / IP
  collaborationCreate: { limit: 5, windowMs: 60 * 60_000 }, // 5 anuncios / hora / usuario
  collaborationContactRequest: { limit: 5, windowMs: 24 * 60 * 60_000 }, // 5 solicitudes / día / usuario
  productEdit: { limit: 20, windowMs: 60 * 60_000 }, // 20 ediciones de producto / hora / usuario
  selfAction: { limit: 30, windowMs: 60_000 }, // 30 acciones propias (perfil, seguir, notificaciones...) / minuto / usuario
  authToken: { limit: 10, windowMs: 15 * 60_000 }, // 10 intentos de token de auth (reset/verify) / 15 min / IP
} satisfies Record<string, RateLimitRule>;

function checkRateLimitMemory(key: string, rule: RateLimitRule): boolean {
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

/** Fixed-window counter in Upstash Redis: one pipelined REST call. */
async function checkRateLimitUpstash(
  restUrl: string,
  token: string,
  key: string,
  rule: RateLimitRule
): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / rule.windowMs);
  const redisKey = `rl:${key}:${windowStart}`;

  const res = await fetch(`${restUrl}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      // Expire slightly after the window so clock skew can't strand keys.
      ["PEXPIRE", redisKey, String(rule.windowMs + 1000)],
    ]),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);

  const [{ result: count }] = (await res.json()) as [{ result: number }, unknown];
  return count <= rule.limit;
}

/**
 * Returns true if the action is allowed, false if rate-limited.
 * `key` should combine the action and actor, e.g. `upvote:${userId}`.
 */
export async function checkRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restUrl && token) {
    try {
      return await checkRateLimitUpstash(restUrl, token, key, rule);
    } catch (err) {
      console.error("[rate-limit] Upstash unavailable, failing open:", err);
      return true;
    }
  }

  return checkRateLimitMemory(key, rule);
}

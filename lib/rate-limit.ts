/**
 * Simple sliding-window rate limiter (in-process, no external dependency).
 *
 * Suitable for self-hosted single-instance deployments. For multi-instance
 * deployments swap the store for `@upstash/ratelimit` backed by Redis.
 *
 * Usage:
 *   const { allowed, remaining, retryAfter } = checkRateLimit(key, { limit: 20, windowMs: 60_000 })
 *   if (!allowed) return new Response("Too Many Requests", { status: 429, headers: { "Retry-After": String(retryAfter) } })
 */

interface WindowEntry {
  count: number
  windowStart: number
}

const store = new Map<string, WindowEntry>()

// Periodically purge stale entries to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 60 * 60 * 1_000) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1_000)

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the window resets (only meaningful when allowed = false) */
  retryAfter: number
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= opts.windowMs) {
    // Start a fresh window
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: opts.limit - 1, retryAfter: 0 }
  }

  entry.count++

  if (entry.count > opts.limit) {
    const retryAfter = Math.ceil((opts.windowMs - (now - entry.windowStart)) / 1_000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  return { allowed: true, remaining: opts.limit - entry.count, retryAfter: 0 }
}

// ─── Pre-configured policies ───────────────────────────────────────────────

/** Per-user policy for AI inference endpoints (e.g. /api/ask) */
export function apiAskRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`ask:${userId}`, { limit: 20, windowMs: 60_000 })
}

/** Per-IP policy for webhook endpoints */
export function webhookRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`webhook:${ip ?? "unknown"}`, { limit: 100, windowMs: 60_000 })
}

/** Per-secret policy for cron endpoints */
export function cronRateLimit(secret: string): RateLimitResult {
  return checkRateLimit(`cron:${secret.slice(0, 8)}`, { limit: 10, windowMs: 60_000 })
}

/** Per-IP policy for OAuth callback endpoints */
export function oauthRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`oauth:${ip ?? "unknown"}`, { limit: 30, windowMs: 60_000 })
}

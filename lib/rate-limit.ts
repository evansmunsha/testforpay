type RateLimitEntry = {
  count: number
  resetAt: number
}

// NOTE: In-memory, best-effort rate limiting.
// This is intentionally minimal to avoid extra infrastructure in production.
const store = new Map<string, RateLimitEntry>()

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: max - 1, resetAt }
  }

  if (entry.count >= max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfter }
  }

  entry.count += 1
  store.set(key, entry)
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

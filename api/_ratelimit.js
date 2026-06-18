// In-memory rate limiter — per Vercel function instance.
// Effective against burst abuse and bot sweeps. Replace with Upstash Redis
// when you need globally consistent limits across all instances at scale.

const store = new Map()

/**
 * Returns true if the request should be blocked.
 * @param {string} ip
 * @param {string} key   — endpoint identifier, e.g. 'sales' | 'demo-build' | 'sales-demo'
 * @param {number} max   — max requests allowed in the window
 * @param {number} windowMs — rolling window in milliseconds
 */
export function checkRateLimit(ip, key, max, windowMs) {
  const now    = Date.now()
  const mapKey = `${ip}:${key}`
  const record = store.get(mapKey) || { count: 0, resetAt: now + windowMs }

  if (now > record.resetAt) {
    record.count  = 0
    record.resetAt = now + windowMs
  }
  record.count++
  store.set(mapKey, record)

  // Prune to prevent unbounded memory growth on long-lived instances
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k)
    }
  }

  return record.count > max
}

/** Extract real client IP from Vercel / proxy headers. */
export function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'
  )
}

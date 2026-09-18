import 'server-only'

// Best-effort, single-process rate limiting for the public tracking lookup
// action (request_number + email/phone -> tracking_token). request_number
// is sequential and guessable, so without a limit here a script could work
// through numbers hunting for a contact-info match. Same known gap as
// src/services/vin/rate-limit.ts (in-memory, resets per instance/redeploy,
// doesn't coordinate across instances) — accepted for the same reason: this
// still meaningfully blunts a single client hammering the endpoint, which
// is the realistic near-term risk for a low-traffic site. A tighter window
// than the VIN limiter on purpose, since this endpoint gates access to
// another customer's data rather than just a paid API call.
const WINDOW_MS = 5 * 60_000
const MAX_REQUESTS_PER_WINDOW = 6
const MAX_TRACKED_KEYS = 5000

type Bucket = { count: number; windowStart: number }

const buckets = new Map<string, Bucket>()

export function isRateLimited(key: string): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now })
    pruneIfNeeded(now)
    return false
  }

  bucket.count += 1
  return bucket.count > MAX_REQUESTS_PER_WINDOW
}

function pruneIfNeeded(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key)
  }
}

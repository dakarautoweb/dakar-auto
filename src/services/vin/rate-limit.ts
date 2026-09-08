import 'server-only'

// Best-effort, single-process rate limiting for the public VIN lookup
// action. Not distributed — it resets per server instance and on
// redeploy, and won't coordinate across multiple instances behind a load
// balancer. That's a known, accepted gap (see task report): adding
// Redis/Upstash purely for this wasn't judged worth the new infrastructure
// yet. This still meaningfully blunts a single client hammering the
// endpoint (accidental or scripted), which is the realistic near-term risk
// for a low-traffic site — if traffic grows enough to need cross-instance
// limits, swap this module for a Redis/Upstash-backed one; nothing else
// needs to change since callers only see isRateLimited().
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 8
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

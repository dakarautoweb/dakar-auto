import 'server-only'

// Best-effort, single-process rate limiting for the signed-upload-URL
// minting endpoint. Not distributed — it resets per server instance and on
// redeploy, and won't coordinate across multiple instances behind a load
// balancer. Same accepted trade-off as src/services/vin/rate-limit.ts and
// src/services/tracking/rate-limit.ts; kept as a separate instance/module
// (rather than sharing one of those) so a burst of photo uploads can't
// starve VIN lookups or tracking lookups, and vice versa.
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20
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

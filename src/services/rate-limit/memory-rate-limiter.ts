import 'server-only'

// Fixed-window, single-process rate limiter — same approach as
// src/services/vin/rate-limit.ts and src/services/tracking/rate-limit.ts,
// as a reusable factory for the chat and recovery endpoints.
//
// NOT distributed: on Vercel every serverless instance has its own memory,
// counters reset on cold start/redeploy, and nothing is shared between
// instances. It blunts a single client hammering one instance; real
// production protection needs a shared store (Upstash/Redis) or Vercel
// Firewall rate-limit rules in front of these endpoints. The OTP limits
// that matter most (attempts per code, codes per request, resend cooldown)
// are enforced in the database instead — see request-recovery/flow.ts.
export type MemoryRateLimiter = {
  isLimited(key: string): boolean
}

const MAX_TRACKED_KEYS = 5000

export function createMemoryRateLimiter({ windowMs, max }: { windowMs: number; max: number }): MemoryRateLimiter {
  const buckets = new Map<string, { count: number; windowStart: number }>()

  function prune(now: number) {
    if (buckets.size < MAX_TRACKED_KEYS) return
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > windowMs) buckets.delete(key)
    }
  }

  return {
    isLimited(key: string) {
      const now = Date.now()
      const bucket = buckets.get(key)
      if (!bucket || now - bucket.windowStart > windowMs) {
        buckets.set(key, { count: 1, windowStart: now })
        prune(now)
        return false
      }
      bucket.count += 1
      return bucket.count > max
    },
  }
}

// First x-forwarded-for entry (the client IP behind Vercel), else
// x-real-ip, else one shared bucket — stricter, never looser.
export function clientKeyFromRequest(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

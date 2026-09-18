import 'server-only'
import { CAR_IMAGE_NEGATIVE_CACHE_TTL_MS, CAR_IMAGE_POSITIVE_CACHE_TTL_MS } from './config'
import type { CarImageQuery } from './types'

// Process-local, in-memory cache keyed by year+make+model+bodyStyle — the
// whole point (see task) is to not spend CarImages API usage on every
// render of the same vehicle. Not a durable store: resets on redeploy/cold start and
// isn't shared across instances, same accepted limitation as the VIN and
// vehicle-photos caches this mirrors (src/services/vin/cache.ts).
//
// Positive entries (a real image URL was found) live for as long as the
// vendor's own signed delivery URL is valid (see
// CAR_IMAGE_POSITIVE_CACHE_TTL_MS). Negative entries (vehicle not in their
// catalog, or the lookup failed) live for a much shorter TTL — long enough
// to stop repeated requests for the same nonexistent car from hammering the
// API, short enough that a vehicle added to their catalog later, or a
// transient failure, gets retried within a reasonable time.
const TTL_MS = { found: CAR_IMAGE_POSITIVE_CACHE_TTL_MS, negative: CAR_IMAGE_NEGATIVE_CACHE_TTL_MS }
const MAX_ENTRIES = 1000

type CacheEntry = { imageUrl: string | null; expiresAt: number }

const cache = new Map<string, CacheEntry>()

function cacheKey({ year, make, model, bodyStyle }: CarImageQuery): string {
  return `${year}|${make.trim().toLowerCase()}|${model.trim().toLowerCase()}|${(bodyStyle ?? '').trim().toLowerCase()}`
}

// Returned shape distinguishes "no cache entry, go fetch" (undefined) from
// "cached negative result, don't bother fetching" ({ imageUrl: null }).
export function getCachedCarImage(query: CarImageQuery): { imageUrl: string | null } | undefined {
  const key = cacheKey(query)
  const entry = cache.get(key)
  if (!entry) return undefined

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }

  return { imageUrl: entry.imageUrl }
}

export function setCachedCarImage(query: CarImageQuery, imageUrl: string | null): void {
  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now()
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key)
    }
    if (cache.size >= MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
  }

  const ttl = imageUrl ? TTL_MS.found : TTL_MS.negative
  cache.set(cacheKey(query), { imageUrl, expiresAt: Date.now() + ttl })
}

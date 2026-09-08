import 'server-only'
import type { VehiclePhotoResult } from './types'

// Short-lived, in-memory, per-server-process cache of successful photo
// lookups only — mirrors the VIN decode cache's design
// (src/services/vin/cache.ts) and the same reasoning: only cache answers
// we're confident in. A "not found" or "unavailable" result is NOT
// cached, so a transient provider hiccup can't get stuck looking like a
// permanent "no photos" answer, and a photo set that gets added to Auto.dev
// later becomes visible on the next lookup rather than being masked by a
// long-lived negative cache entry.
const TTL_MS = 45 * 60 * 1000 // 45 minutes — within the requested 30–60 min window
const MAX_ENTRIES = 500

type CacheEntry = { photos: VehiclePhotoResult; expiresAt: number }

const cache = new Map<string, CacheEntry>()

export function getCachedPhotos(vin: string): VehiclePhotoResult | null {
  const entry = cache.get(vin)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cache.delete(vin)
    return null
  }

  return entry.photos
}

export function setCachedPhotos(vin: string, photos: VehiclePhotoResult): void {
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

  cache.set(vin, { photos, expiresAt: Date.now() + TTL_MS })
}

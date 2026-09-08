import 'server-only'
import type { VehicleResult } from './types'

// Decision (see task report): we deliberately do NOT reuse vehicles already
// stored in our own `vehicles` table to answer a VIN lookup. That table is
// populated by whatever provider/data was available at request-submission
// time in the past, including possibly-incomplete manual/legacy rows, and
// silently resurfacing that as "the answer" for a fresh lookup risks
// returning stale or partial data — the one thing this task explicitly
// says not to do.
//
// Instead, this is a small in-memory, short-TTL cache of *successful*
// Auto.dev decodes only, keyed by VIN. It only smooths over accidental
// duplicate calls in the same session (double submit, back/forward through
// the wizard, a page refresh) — not a durable store. It's per server
// process: it resets on redeploy/cold start and isn't shared across
// multiple instances. That's an accepted limitation for what this is (a
// cheap way to cut a handful of redundant billed API calls), not a
// correctness mechanism.
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 500

type CacheEntry = { vehicle: VehicleResult; expiresAt: number }

const cache = new Map<string, CacheEntry>()

export function getCachedVehicle(vin: string): VehicleResult | null {
  const entry = cache.get(vin)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cache.delete(vin)
    return null
  }

  return entry.vehicle
}

export function setCachedVehicle(vin: string, vehicle: VehicleResult): void {
  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now()
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key)
    }
    // Still full after clearing expired entries — drop the oldest insertion
    // (Map preserves insertion order) rather than growing unbounded.
    if (cache.size >= MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
  }

  cache.set(vin, { vehicle, expiresAt: Date.now() + TTL_MS })
}

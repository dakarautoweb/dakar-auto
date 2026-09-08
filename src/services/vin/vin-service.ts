import 'server-only'
import { maskVin, normalizeVin, validateVin } from '@/src/lib/vin'
import { lookupVehiclePhoto } from '@/src/services/vehicle-photos/photos-service'
import { getAutoDevApiKey } from './config'
import { AutoDevVinProvider } from './auto-dev-vin-provider'
import { MockVinProvider } from './mock-vin-provider'
import { getCachedVehicle, setCachedVehicle } from './cache'
import type { VinLookupResult, VinProvider } from './types'

// Single place to swap providers. The rest of the app only ever talks to
// lookupVehicleByVin — never to a specific provider implementation, so the
// UI has no idea whether a result came from Auto.dev or the mock provider.
function createProvider(): VinProvider {
  const apiKey = getAutoDevApiKey()

  if (apiKey) {
    return new AutoDevVinProvider(apiKey)
  }

  // Missing config must never look like a working integration — log it
  // loudly (server-side only, no secrets) instead of silently degrading.
  // We still fall back to the mock provider rather than hard-failing every
  // lookup, since a misconfigured env var shouldn't take down the whole
  // VIN step for every customer; the manual fallback covers real failures
  // regardless, but this keeps VIN entry itself functional too.
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[vin] AUTO_DEV_API_KEY is not configured in production — falling back to the mock VIN provider. Set AUTO_DEV_API_KEY to enable real VIN decoding.'
    )
  } else {
    console.warn('[vin] AUTO_DEV_API_KEY is not set — using the mock VIN provider for development.')
  }

  return new MockVinProvider()
}

const provider = createProvider()

export async function lookupVehicleByVin(rawVin: string): Promise<VinLookupResult> {
  const vin = normalizeVin(rawVin)
  const validationError = validateVin(vin)
  if (validationError) {
    return { status: 'invalid', reason: validationError }
  }

  const cached = getCachedVehicle(vin)
  if (cached) {
    return { status: 'found', vehicle: cached }
  }

  try {
    const result = await provider.lookup(vin)

    if (result.status === 'found') {
      // Best-effort photo enrichment: only for real Auto.dev decodes (the
      // mock provider has no corresponding photos to fetch), and never
      // allowed to turn a successful decode into a failure — any problem
      // here just leaves imageUrl null, and the UI's existing placeholder
      // covers that exactly as it already did before this feature existed.
      if (result.vehicle.source === 'auto_dev') {
        try {
          const photoResult = await lookupVehiclePhoto(vin)
          if (photoResult.status === 'found') {
            result.vehicle.imageUrl = photoResult.photos.primaryImageUrl
          }
        } catch (err) {
          console.error(`[vin] Unexpected error enriching VIN ${maskVin(vin)} with a photo:`, err instanceof Error ? err.message : 'Unknown error')
        }
      }

      setCachedVehicle(vin, result.vehicle)
    }

    return result
  } catch (err) {
    console.error(`[vin] Unexpected error looking up VIN ${maskVin(vin)}:`, err instanceof Error ? err.message : 'Unknown error')
    return { status: 'unavailable' }
  }
}

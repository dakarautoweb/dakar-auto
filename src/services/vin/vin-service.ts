import 'server-only'
import { maskVin, normalizeVin, validateVin } from '@/src/lib/vin'
import { lookupVehiclePhoto } from '@/src/services/vehicle-photos/photos-service'
import { lookupCarImage } from '@/src/services/car-image/car-image-service'
import { getAutoDevApiKey } from './config'
import { AutoDevVinProvider } from './auto-dev-vin-provider'
import { MockVinProvider } from './mock-vin-provider'
import { getCachedResult, setCachedResult } from './cache'
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

  const cached = getCachedResult(vin)
  if (cached) {
    return cached
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

        // Fall back to a generic year/make/model photo (CarImages API)
        // only when the VIN-specific photo lookup above found nothing —
        // an actual photo of this physical car is always preferred over a
        // stock photo of the same make/model, and this avoids spending
        // CarImages API usage when we already have something better.
        // bodyStyle is passed through so the lookup can prefer/verify the
        // matching body style (e.g. a coupe, not a sedan) — it's used only
        // for the image search, never altering the displayed vehicle data.
        if (!result.vehicle.imageUrl && result.vehicle.year && result.vehicle.make && result.vehicle.model) {
          try {
            const carImageResult = await lookupCarImage({
              year: result.vehicle.year,
              make: result.vehicle.make,
              model: result.vehicle.model,
              bodyStyle: result.vehicle.bodyStyle,
            })
            if (carImageResult.status === 'found') {
              result.vehicle.imageUrl = carImageResult.imageUrl
            }
          } catch (err) {
            console.error(
              `[vin] Unexpected error enriching VIN ${maskVin(vin)} with a car image:`,
              err instanceof Error ? err.message : 'Unknown error'
            )
          }
        }
      }

      setCachedResult(vin, result)
    }

    // A partial match (make only) skips photo enrichment entirely: both
    // photo lookups need at least a model to find anything meaningful, and
    // a make-only stock photo would be a guess at what the car looks like.
    if (result.status === 'partial') {
      setCachedResult(vin, result)
    }

    return result
  } catch (err) {
    console.error(`[vin] Unexpected error looking up VIN ${maskVin(vin)}:`, err instanceof Error ? err.message : 'Unknown error')
    return { status: 'unavailable' }
  }
}

import 'server-only'
import { getCarImagesApiKey } from './config'
import { CarImagesApiProvider } from './carimages-api-provider'
import { getCachedCarImage, setCachedCarImage } from './cache'
import type { CarImageLookupResult, CarImageProvider, CarImageQuery } from './types'

// Single place to swap providers, mirroring src/services/vin/vin-service.ts.
// Active provider: CarImages API (https://carimagesapi.com/docs). CarsXE
// and carimage.dev are no longer imported or called anywhere in this
// module — this is the sole active vehicle-image provider.
function createProvider(): CarImageProvider | null {
  const apiKey = getCarImagesApiKey()
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[car-image] CARIMAGES_API_KEY is not configured — vehicle image lookups are disabled.')
    } else {
      console.warn('[car-image] CARIMAGES_API_KEY is not set — vehicle image lookups are disabled in development.')
    }
    return null
  }
  return new CarImagesApiProvider(apiKey)
}

const provider = createProvider()

// Best-effort: a real photo of this year/make/model(/bodyStyle) from
// CarImages API, used to enrich a vehicle when we don't already have an
// actual photo of the specific physical car (see vin-service.ts, which
// only calls this when the Auto.dev VIN-specific photo lookup found
// nothing). Never throws, and any failure — timeout, auth, rate limit,
// vehicle not in their catalog, a detected body-style mismatch, malformed
// response — just returns 'unavailable'/'not_found' so the caller leaves
// imageUrl null and the existing VehicleImage fallback
// (/vehicle-fallback.png) takes over.
//
// The candidate cascade (raw model -> body-style variant -> base model)
// and the body-style-mismatch check both live inside CarImagesApiProvider
// — this layer only owns caching, keyed on the full (year, make, model,
// bodyStyle) tuple so a repeat lookup for the same vehicle never spends
// provider usage twice.
export async function lookupCarImage(query: CarImageQuery): Promise<CarImageLookupResult> {
  const cached = getCachedCarImage(query)
  if (cached) {
    return cached.imageUrl ? { status: 'found', imageUrl: cached.imageUrl } : { status: 'not_found' }
  }

  if (!provider) return { status: 'unavailable' }

  try {
    const result = await provider.lookup(query)
    if (result.status === 'found') {
      setCachedCarImage(query, result.imageUrl)
    } else if (result.status === 'not_found') {
      setCachedCarImage(query, null)
    }
    // 'unavailable' is deliberately NOT cached — a transient network/API
    // failure shouldn't stop the very next request (possibly seconds
    // later) from trying again.
    return result
  } catch (err) {
    console.error('[car-image] Unexpected error looking up a car image:', err instanceof Error ? err.message : 'Unknown error')
    return { status: 'unavailable' }
  }
}

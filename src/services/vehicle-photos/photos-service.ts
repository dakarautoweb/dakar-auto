import 'server-only'
import { maskVin, normalizeVin, validateVin } from '@/src/lib/vin'
import { getAutoDevApiKey } from './config'
import { AutoDevVehiclePhotosProvider } from './auto-dev-vehicle-photos-provider'
import { getCachedPhotos, setCachedPhotos } from './cache'
import type { VehiclePhotoLookupResult } from './types'

// The real, documented Auto.dev Vehicle Photos API is keyed by VIN only —
// it does not accept year/make/model/trim (confirmed against the current
// docs at https://docs.auto.dev/v2/products/vehicle-photos). Since this is
// only ever called right after a successful VIN decode, VIN is always
// available and is in fact a more precise key than year/make/model would
// have been.
export async function lookupVehiclePhoto(rawVin: string): Promise<VehiclePhotoLookupResult> {
  const vin = normalizeVin(rawVin)
  if (validateVin(vin)) return { status: 'unavailable' }

  const cached = getCachedPhotos(vin)
  if (cached) return { status: 'found', photos: cached }

  const apiKey = getAutoDevApiKey()
  if (!apiKey) return { status: 'unavailable' }

  try {
    const provider = new AutoDevVehiclePhotosProvider(apiKey)
    const result = await provider.lookup(vin)
    if (result.status === 'found') {
      setCachedPhotos(vin, result.photos)
    }
    return result
  } catch (err) {
    console.error(`[vehicle-photos] Unexpected error looking up photos for ${maskVin(vin)}:`, err instanceof Error ? err.message : 'Unknown error')
    return { status: 'unavailable' }
  }
}

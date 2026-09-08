import 'server-only'
import { maskVin } from '@/src/lib/vin'
import { AUTO_DEV_BASE_URL, AUTO_DEV_PHOTOS_TIMEOUT_MS, MAX_ADDITIONAL_PHOTOS } from './config'
import type { VehiclePhotoLookupResult, VehiclePhotosProvider } from './types'

// Documented shape (https://docs.auto.dev/v2/products/vehicle-photos):
// { "data": { "retail": ["https://api.auto.dev/photos/retail/{vin}-1.jpg", ...] } }
// `wholesale` isn't shown in the docs' example payload but is mentioned in
// prose as sometimes present — read defensively in case it is.
type AutoDevPhotosResponse = {
  data?: {
    retail?: string[] | null
    wholesale?: string[] | null
  } | null
}

type AutoDevErrorBody = {
  code?: string
  message?: string
}

function safeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

export class AutoDevVehiclePhotosProvider implements VehiclePhotosProvider {
  constructor(private readonly apiKey: string) {}

  async lookup(vin: string): Promise<VehiclePhotoLookupResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AUTO_DEV_PHOTOS_TIMEOUT_MS)
    const masked = maskVin(vin)

    try {
      const response = await fetch(`${AUTO_DEV_BASE_URL}/photos/${encodeURIComponent(vin)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        return this.handleErrorResponse(response, masked)
      }

      let body: AutoDevPhotosResponse
      try {
        body = (await response.json()) as AutoDevPhotosResponse
      } catch {
        console.error(`[vehicle-photos] Auto.dev returned an unparsable response body for VIN ${masked}`)
        return { status: 'unavailable' }
      }

      const urls = [...(body.data?.retail ?? []), ...(body.data?.wholesale ?? [])].filter(
        (url): url is string => typeof url === 'string' && url.length > 0
      )

      if (urls.length === 0) {
        return { status: 'not_found' }
      }

      return {
        status: 'found',
        photos: {
          primaryImageUrl: urls[0],
          additionalImageUrls: urls.slice(1, 1 + MAX_ADDITIONAL_PHOTOS),
          source: 'auto_dev',
        },
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(`[vehicle-photos] Auto.dev request timed out after ${AUTO_DEV_PHOTOS_TIMEOUT_MS}ms for VIN ${masked}`)
      } else {
        console.error(`[vehicle-photos] Auto.dev request failed for VIN ${masked}:`, safeErrorMessage(err))
      }
      return { status: 'unavailable' }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async handleErrorResponse(response: Response, masked: string): Promise<VehiclePhotoLookupResult> {
    let code: string | undefined
    try {
      const body = (await response.json()) as AutoDevErrorBody
      code = body.code
    } catch {
      // Error responses aren't guaranteed to have a JSON body.
    }

    if (response.status === 404) {
      // Docs: "This vehicle does not have any photos available" — a normal
      // outcome, not a failure.
      return { status: 'not_found' }
    }

    if (response.status === 401 || response.status === 403) {
      console.error(`[vehicle-photos] Auto.dev authentication failed (status ${response.status}, ${code ?? 'no code'}) — check AUTO_DEV_API_KEY`)
      return { status: 'unavailable' }
    }

    if (response.status === 429) {
      console.error(`[vehicle-photos] Auto.dev rate limit exceeded (${code ?? 'no code'}) for ${masked}`)
      return { status: 'unavailable' }
    }

    console.error(`[vehicle-photos] Auto.dev returned status ${response.status} (${code ?? 'no code'}) for ${masked}`)
    return { status: 'unavailable' }
  }
}

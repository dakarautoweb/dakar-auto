import 'server-only'
import { maskVin } from '@/src/lib/vin'
import { AUTO_DEV_BASE_URL, AUTO_DEV_TIMEOUT_MS } from './config'
import type { VehicleResult, VinLookupResult, VinProvider } from './types'

// Shape of the fields we actually read from Auto.dev's v2 VIN decode
// response. The live payload has more fields (wmi, origin, checksum,
// nested `vehicle`, ...) — we only declare what we map, and treat
// everything as optional since the docs don't guarantee presence.
type AutoDevVinResponse = {
  make?: string | null
  model?: string | null
  trim?: string | null
  body?: string | null
  engine?: string | null
  drive?: string | null
  transmission?: string | null
  fuel?: string | null
  vehicle?: {
    year?: number | null
    make?: string | null
    model?: string | null
  } | null
}

type AutoDevErrorBody = {
  code?: string
  message?: string
}

function safeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

export class AutoDevVinProvider implements VinProvider {
  constructor(private readonly apiKey: string) {}

  async lookup(vin: string): Promise<VinLookupResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AUTO_DEV_TIMEOUT_MS)
    const masked = maskVin(vin)

    try {
      const response = await fetch(`${AUTO_DEV_BASE_URL}/vin/${encodeURIComponent(vin)}`, {
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

      let body: AutoDevVinResponse
      try {
        body = (await response.json()) as AutoDevVinResponse
      } catch {
        console.error(`[vin] Auto.dev returned an unparsable response body for VIN ${masked}`)
        return { status: 'unavailable' }
      }

      return this.normalize(vin, body, masked)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(`[vin] Auto.dev request timed out after ${AUTO_DEV_TIMEOUT_MS}ms for VIN ${masked}`)
      } else {
        console.error(`[vin] Auto.dev request failed for VIN ${masked}:`, safeErrorMessage(err))
      }
      return { status: 'unavailable' }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async handleErrorResponse(response: Response, masked: string): Promise<VinLookupResult> {
    let code: string | undefined
    try {
      const body = (await response.json()) as AutoDevErrorBody
      code = body.code
    } catch {
      // Error responses aren't guaranteed to have a JSON body — fall back
      // to the HTTP status alone.
    }

    switch (response.status) {
      case 404:
        console.error(`[vin] Auto.dev: VIN not found (${code ?? 'no code'}) for ${masked}`)
        return { status: 'not_found' }

      case 422:
        // VIN is syntactically valid but Auto.dev couldn't decode it
        // (VIN_DECODE_FAILED) — from the customer's perspective this reads
        // the same as "we couldn't identify this vehicle".
        console.error(`[vin] Auto.dev: could not decode VIN (${code ?? 'no code'}) for ${masked}`)
        return { status: 'not_found' }

      case 401:
      case 403:
        // Never log the key itself — only that auth is broken, which is an
        // operator-facing signal to check AUTO_DEV_API_KEY.
        console.error(`[vin] Auto.dev authentication failed (status ${response.status}, ${code ?? 'no code'}) — check AUTO_DEV_API_KEY`)
        return { status: 'unavailable' }

      case 429:
        console.error(`[vin] Auto.dev rate limit exceeded (${code ?? 'no code'}) for ${masked}`)
        return { status: 'unavailable' }

      case 402:
        console.error(`[vin] Auto.dev plan/feature restriction (${code ?? 'no code'})`)
        return { status: 'unavailable' }

      default:
        console.error(`[vin] Auto.dev returned status ${response.status} (${code ?? 'no code'}) for ${masked}`)
        return { status: 'unavailable' }
    }
  }

  private normalize(vin: string, body: AutoDevVinResponse, masked: string): VinLookupResult {
    const make = body.make?.trim() || body.vehicle?.make?.trim() || ''
    const model = body.model?.trim() || body.vehicle?.model?.trim() || ''

    // A 200 with no make/model isn't a real decode — treat it as an
    // unexpected response shape rather than fabricating a result or
    // pretending the vehicle wasn't found (it may well exist; the response
    // just didn't contain what we need).
    if (!make || !model) {
      console.error(`[vin] Auto.dev response for ${masked} was missing make/model`)
      return { status: 'unavailable' }
    }

    const vehicle: VehicleResult = {
      vin,
      year: body.vehicle?.year ?? null,
      make,
      model,
      trim: body.trim?.trim() || null,
      engine: body.engine?.trim() || null,
      transmission: body.transmission?.trim() || null,
      bodyStyle: body.body?.trim() || null,
      fuelType: body.fuel?.trim() || null,
      drivetrain: body.drive?.trim() || null,
      // Auto.dev's v2 VIN decode response does not include an image URL —
      // never invent one. The wizard's existing placeholder art covers this.
      imageUrl: null,
      source: 'auto_dev',
    }

    return { status: 'found', vehicle }
  }
}

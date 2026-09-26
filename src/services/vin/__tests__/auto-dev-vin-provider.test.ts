import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoDevVinProvider } from '../auto-dev-vin-provider'
import { FULL_BODY, FULL_VIN, PARTIAL_BMW_BODY, PARTIAL_BMW_VIN, jsonResponse } from './fixtures'

// fetch is mocked throughout — this never calls the real Auto.dev API.

const provider = new AutoDevVinProvider('test-key')

beforeEach(() => {
  // The provider logs every non-success outcome by design; keep test
  // output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('AutoDevVinProvider — successful decodes', () => {
  it('returns found with every mapped field for a full decode (make + model + year)', async () => {
    stubFetch(jsonResponse(FULL_BODY))

    const result = await provider.lookup(FULL_VIN)

    expect(result).toEqual({
      status: 'found',
      vehicle: {
        vin: FULL_VIN,
        year: 2003,
        make: 'Honda',
        model: 'Accord',
        trim: 'EX',
        engine: '3.0L V6',
        transmission: 'Automatic',
        bodyStyle: 'Sedan',
        fuelType: 'Gasoline',
        drivetrain: 'FWD',
        imageUrl: null,
        source: 'auto_dev',
      },
    })
  })

  it('returns partial (not unavailable) for WBAKV210500V39117: valid VIN, make only', async () => {
    const fetchMock = stubFetch(jsonResponse(PARTIAL_BMW_BODY))

    const result = await provider.lookup(PARTIAL_BMW_VIN)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.status).not.toBe('unavailable')
    expect(result).toEqual({
      status: 'partial',
      vehicle: {
        vin: PARTIAL_BMW_VIN,
        make: 'BMW',
        // Never guessed — Auto.dev returned neither.
        model: null,
        year: null,
        trim: null,
        engine: null,
        transmission: null,
        bodyStyle: null,
        fuelType: null,
        drivetrain: null,
        source: 'auto_dev',
      },
    })
  })

  it('keeps any real extra data Auto.dev returned alongside a partial decode', async () => {
    stubFetch(jsonResponse({ ...PARTIAL_BMW_BODY, fuel: 'Diesel', vehicle: { ...PARTIAL_BMW_BODY.vehicle, year: 2014 } }))

    const result = await provider.lookup(PARTIAL_BMW_VIN)

    expect(result.status).toBe('partial')
    if (result.status !== 'partial') return
    expect(result.vehicle.fuelType).toBe('Diesel')
    expect(result.vehicle.year).toBe(2014)
    expect(result.vehicle.model).toBeNull()
  })
})

describe('AutoDevVinProvider — unusable 200 responses stay unavailable', () => {
  it('returns unavailable when neither make nor model is present', async () => {
    stubFetch(jsonResponse({ vinValid: true, vehicle: { make: '', model: '' } }))
    expect(await provider.lookup(PARTIAL_BMW_VIN)).toEqual({ status: 'unavailable' })
  })

  it('does not treat make-only as partial unless Auto.dev says the VIN is valid', async () => {
    stubFetch(jsonResponse({ ...PARTIAL_BMW_BODY, vinValid: false }))
    expect(await provider.lookup(PARTIAL_BMW_VIN)).toEqual({ status: 'unavailable' })
  })

  it('returns unavailable for an unparsable body', async () => {
    stubFetch(new Response('<html>not json</html>', { status: 200 }))
    expect(await provider.lookup(FULL_VIN)).toEqual({ status: 'unavailable' })
  })
})

describe('AutoDevVinProvider — real service failures stay unavailable', () => {
  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [402, 'PAYMENT_REQUIRED'],
    [429, 'RATE_LIMITED'],
    [500, 'INTERNAL_ERROR'],
    [503, 'SERVICE_UNAVAILABLE'],
  ])('HTTP %i → unavailable', async (status, code) => {
    stubFetch(jsonResponse({ code, message: 'x' }, status))
    expect(await provider.lookup(FULL_VIN)).toEqual({ status: 'unavailable' })
  })

  it('network failure → unavailable', async () => {
    stubFetch(new TypeError('fetch failed'))
    expect(await provider.lookup(FULL_VIN)).toEqual({ status: 'unavailable' })
  })

  it('timeout (aborted request) → unavailable', async () => {
    const abort = new Error('The operation was aborted')
    abort.name = 'AbortError'
    stubFetch(abort)
    expect(await provider.lookup(FULL_VIN)).toEqual({ status: 'unavailable' })
  })
})

describe('AutoDevVinProvider — not-found behavior unchanged', () => {
  it('HTTP 404 → not_found', async () => {
    stubFetch(jsonResponse({ code: 'VIN_NOT_FOUND' }, 404))
    expect(await provider.lookup(FULL_VIN)).toEqual({ status: 'not_found' })
  })

  it('HTTP 422 (VIN_DECODE_FAILED) → not_found', async () => {
    stubFetch(jsonResponse({ code: 'VIN_DECODE_FAILED' }, 422))
    expect(await provider.lookup(FULL_VIN)).toEqual({ status: 'not_found' })
  })
})

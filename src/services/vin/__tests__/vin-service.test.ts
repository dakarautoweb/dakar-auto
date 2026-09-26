import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FULL_BODY, FULL_VIN, PARTIAL_BMW_BODY, PARTIAL_BMW_VIN, jsonResponse } from './fixtures'

// Exercises lookupVehicleByVin end to end with a mocked fetch and mocked
// photo services — no real Auto.dev/CarImages calls. vin-service picks its
// provider (and the cache lives) at module load, so each test re-imports
// it fresh with a fake key configured.

const { lookupVehiclePhoto, lookupCarImage } = vi.hoisted(() => ({
  lookupVehiclePhoto: vi.fn(),
  lookupCarImage: vi.fn(),
}))

vi.mock('@/src/services/vehicle-photos/photos-service', () => ({ lookupVehiclePhoto }))
vi.mock('@/src/services/car-image/car-image-service', () => ({ lookupCarImage }))

async function loadService() {
  vi.resetModules()
  vi.stubEnv('AUTO_DEV_API_KEY', 'test-key')
  return import('../vin-service')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  lookupVehiclePhoto.mockReset().mockResolvedValue({ status: 'not_found' })
  lookupCarImage.mockReset().mockResolvedValue({ status: 'found', imageUrl: 'https://img.example/honda.jpg' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('lookupVehicleByVin', () => {
  it('full decode: found, with photo enrichment as before', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(FULL_BODY)))
    const { lookupVehicleByVin } = await loadService()

    const result = await lookupVehicleByVin(FULL_VIN)

    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.vehicle).toMatchObject({ make: 'Honda', model: 'Accord', year: 2003, source: 'auto_dev' })
    expect(result.vehicle.imageUrl).toBe('https://img.example/honda.jpg')
    expect(lookupVehiclePhoto).toHaveBeenCalledTimes(1)
    expect(lookupCarImage).toHaveBeenCalledTimes(1)
  })

  it('partial decode (WBAKV210500V39117): partial, no photo lookups, cached', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(PARTIAL_BMW_BODY))
    vi.stubGlobal('fetch', fetchMock)
    const { lookupVehicleByVin } = await loadService()

    const result = await lookupVehicleByVin('  wbakv210500v39117 ')

    expect(result).toMatchObject({ status: 'partial', vehicle: { vin: PARTIAL_BMW_VIN, make: 'BMW', model: null, year: null } })
    expect(lookupVehiclePhoto).not.toHaveBeenCalled()
    expect(lookupCarImage).not.toHaveBeenCalled()

    // A second lookup (e.g. the homepage hero handing off to the wizard)
    // is served from cache rather than billed again.
    expect(await lookupVehicleByVin(PARTIAL_BMW_VIN)).toEqual(result)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('real service failure: unavailable, and never cached', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: 'INTERNAL_ERROR' }, 500))
    vi.stubGlobal('fetch', fetchMock)
    const { lookupVehicleByVin } = await loadService()

    expect(await lookupVehicleByVin(FULL_VIN)).toEqual({ status: 'unavailable' })
    expect(await lookupVehicleByVin(FULL_VIN)).toEqual({ status: 'unavailable' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('not found: unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ code: 'VIN_NOT_FOUND' }, 404)))
    const { lookupVehicleByVin } = await loadService()

    expect(await lookupVehicleByVin(FULL_VIN)).toEqual({ status: 'not_found' })
  })

  it.each([
    ['WBAKV210500V3911', 'length'],
    ['WBAKV210500V3911O', 'characters'],
  ])('invalid VIN %s → invalid (%s) without calling Auto.dev', async (vin, reason) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { lookupVehicleByVin } = await loadService()

    expect(await lookupVehicleByVin(vin)).toEqual({ status: 'invalid', reason })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

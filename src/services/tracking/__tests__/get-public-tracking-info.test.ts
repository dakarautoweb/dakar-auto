import { beforeEach, describe, expect, it, vi } from 'vitest'

const getTrackingInfo = vi.hoisted(() => vi.fn())
const getVehicleTrackingInfo = vi.hoisted(() => vi.fn())

vi.mock('../get-tracking-info', () => ({ getTrackingInfo }))
vi.mock('../get-vehicle-tracking-info', () => ({ getVehicleTrackingInfo }))

import { getPublicTrackingInfo } from '../get-public-tracking-info'

beforeEach(() => {
  getTrackingInfo.mockReset()
  getVehicleTrackingInfo.mockReset()
})

describe('getPublicTrackingInfo', () => {
  it('returns a parts tracking result without probing vehicle requests', async () => {
    const parts = { requestNumber: 'DA-1', customerName: 'Awa Ndiaye' }
    getTrackingInfo.mockResolvedValue(parts)

    await expect(getPublicTrackingInfo('token')).resolves.toEqual({ kind: 'parts', data: parts })
    expect(getVehicleTrackingInfo).not.toHaveBeenCalled()
  })

  it('falls back to vehicle tracking', async () => {
    const vehicle = { requestNumber: 'VR-1', customerName: 'Awa Ndiaye' }
    getTrackingInfo.mockResolvedValue(null)
    getVehicleTrackingInfo.mockResolvedValue(vehicle)

    await expect(getPublicTrackingInfo('token')).resolves.toEqual({ kind: 'vehicle', data: vehicle })
  })

  it('returns null for an invalid, expired, or unknown token', async () => {
    getTrackingInfo.mockResolvedValue(null)
    getVehicleTrackingInfo.mockResolvedValue(null)

    await expect(getPublicTrackingInfo('unknown-token')).resolves.toBeNull()
  })
})

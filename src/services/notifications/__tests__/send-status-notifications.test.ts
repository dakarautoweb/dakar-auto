import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendStatusUpdateEmail: vi.fn(),
  sendVehicleRequestStatusUpdateEmail: vi.fn(),
  sendWhatsAppStatusUpdate: vi.fn(),
  sendVehicleFoundWhatsApp: vi.fn(),
}))

vi.mock('@/src/services/email', () => ({
  sendStatusUpdateEmail: mocks.sendStatusUpdateEmail,
  sendVehicleRequestStatusUpdateEmail: mocks.sendVehicleRequestStatusUpdateEmail,
}))
vi.mock('@/src/services/whatsapp/send-status-update', () => ({ sendWhatsAppStatusUpdate: mocks.sendWhatsAppStatusUpdate }))
vi.mock('@/src/services/whatsapp/send-vehicle-found', () => ({ sendVehicleFoundWhatsApp: mocks.sendVehicleFoundWhatsApp }))

import { sendPartsStatusNotification } from '../send-parts-status-notification'
import { sendVehicleRequestStatusNotification } from '../send-vehicle-request-status-notification'

const base = {
  requestNumber: 'VR-2026-1', customerName: 'Awa', customerEmail: 'awa@example.test', whatsappPhone: '+221771234567',
  locale: 'fr' as const, trackingUrl: 'https://example.test/track/token', trackingToken: 'token',
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset().mockResolvedValue(undefined))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe.each(['whatsapp', 'email', 'phone'] as const)('parts status routing: %s', (preferredContact) => {
  it('uses exactly the preferred customer channel', async () => {
    await sendPartsStatusNotification({ ...base, requestNumber: 'DA-2026-1', preferredContact, status: 'on_treatment' })
    expect(mocks.sendWhatsAppStatusUpdate).toHaveBeenCalledTimes(preferredContact === 'whatsapp' ? 1 : 0)
    expect(mocks.sendStatusUpdateEmail).toHaveBeenCalledTimes(preferredContact === 'email' ? 1 : 0)
  })
})

describe.each(['whatsapp', 'email', 'phone'] as const)('normal vehicle status routing: %s', (preferredContact) => {
  it('uses exactly the preferred customer channel', async () => {
    await sendVehicleRequestStatusNotification({ ...base, preferredContact, status: 'on_treatment' })
    expect(mocks.sendWhatsAppStatusUpdate).toHaveBeenCalledTimes(preferredContact === 'whatsapp' ? 1 : 0)
    expect(mocks.sendVehicleRequestStatusUpdateEmail).toHaveBeenCalledTimes(preferredContact === 'email' ? 1 : 0)
    expect(mocks.sendVehicleFoundWhatsApp).not.toHaveBeenCalled()
  })
})

describe.each(['whatsapp', 'email', 'phone'] as const)('vehicle_found routing: %s', (preferredContact) => {
  it('uses the photo template only for WhatsApp', async () => {
    await sendVehicleRequestStatusNotification({
      ...base,
      preferredContact,
      status: 'vehicle_found',
      foundVehicle: { make: 'Toyota', model: 'RAV4', year: 2021, price: 25000, currency: 'CAD', imageReference: null },
    })
    expect(mocks.sendVehicleFoundWhatsApp).toHaveBeenCalledTimes(preferredContact === 'whatsapp' ? 1 : 0)
    expect(mocks.sendVehicleRequestStatusUpdateEmail).toHaveBeenCalledTimes(preferredContact === 'email' ? 1 : 0)
    expect(mocks.sendWhatsAppStatusUpdate).not.toHaveBeenCalled()
  })
})

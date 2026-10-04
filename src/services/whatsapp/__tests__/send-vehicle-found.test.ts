import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendWhatsAppCustomerConfirmation = vi.hoisted(() => vi.fn())
vi.mock('../send-customer-confirmation', () => ({ sendWhatsAppCustomerConfirmation }))
vi.mock('@/src/lib/supabase/server', () => ({
  supabaseAdmin: { storage: { from: vi.fn(() => ({ createSignedUrl: vi.fn() })) } },
}))

import { sendVehicleFoundWhatsApp } from '../send-vehicle-found'

const data = {
  customerName: 'Awa', requestNumber: 'VR-1', trackingToken: '00000000-0000-4000-8000-000000000000', locale: 'fr' as const,
  whatsappPhone: '+221771234567',
  vehicle: { make: 'Toyota', model: 'RAV4', year: 2021, price: 25000, currency: 'CAD', imageReference: null },
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://dakar.example/')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example')
  sendWhatsAppCustomerConfirmation.mockReset().mockResolvedValue({ ok: true, messageId: 'id' })
})
afterEach(() => vi.unstubAllEnvs())

describe('sendVehicleFoundWhatsApp', () => {
  it('uses a real public photo and the tracking-token-only button suffix', async () => {
    await sendVehicleFoundWhatsApp({ ...data, vehicle: { ...data.vehicle, imageReference: { bucket: 'inventory-vehicle-photos', path: 'cars/one.jpg' } } })
    expect(sendWhatsAppCustomerConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      headerImageUrl: expect.stringContaining('/inventory-vehicle-photos/cars/one.jpg'),
      urlButtonParameter: data.trackingToken,
      bodyParameters: ['Awa', 'Toyota RAV4', '2021', expect.stringContaining('CAD')],
    }))
  })

  it('uses the absolute Dakar Auto logo fallback when no photo exists', async () => {
    await sendVehicleFoundWhatsApp(data)
    expect(sendWhatsAppCustomerConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      headerImageUrl: 'https://dakar.example/brand/dakar-auto-logo.png',
    }))
  })
})

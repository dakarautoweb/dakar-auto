import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNotificationData, buildVehicleNotificationData } from '@/src/services/notifications/__tests__/fixtures'

// Email is mocked so the orchestrator test below doesn't need Resend;
// WhatsApp runs for real against a mocked fetch — never the Meta API.
vi.mock('@/src/services/email', () => ({
  sendVehicleRequestAdminEmail: vi.fn().mockResolvedValue(undefined),
  sendVehicleRequestCustomerEmail: vi.fn().mockResolvedValue(undefined),
}))

import { sendVehicleRequestAdminEmail, sendVehicleRequestCustomerEmail } from '@/src/services/email'
import { sendVehicleRequestNotifications } from '@/src/services/notifications/send-vehicle-request-notifications'
import { sendPartsRequestWhatsAppConfirmation } from '../send-parts-request-confirmation'
import { buildWantedVehicleSummary, sendVehicleRequestWhatsAppConfirmation } from '../send-vehicle-request-confirmation'

const TOKEN = 'test-token-never-logged'

const BASE_ENV = {
  WHATSAPP_CLOUD_API_TOKEN: TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
  WHATSAPP_GRAPH_API_VERSION: 'v23.0',
}

const VEHICLE_TEMPLATE_ENV = {
  WHATSAPP_VEHICLE_TEMPLATE_NAME_FR: 'dakar_vehicle_request_received_fr',
  WHATSAPP_VEHICLE_TEMPLATE_LANGUAGE_FR: 'fr',
  WHATSAPP_VEHICLE_TEMPLATE_NAME_EN: 'dakar_vehicle_request_received_en',
  WHATSAPP_VEHICLE_TEMPLATE_LANGUAGE_EN: 'en',
}

const PARTS_TEMPLATE_ENV = {
  WHATSAPP_TEMPLATE_NAME_FR: 'dakar_request_received_fr',
  WHATSAPP_TEMPLATE_LANGUAGE_FR: 'fr',
  WHATSAPP_TEMPLATE_NAME_EN: 'dakar_request_received_en',
  WHATSAPP_TEMPLATE_LANGUAGE_EN: 'en',
}

function okResponse() {
  return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.VR' }] }) }
}

function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.map((args) => args.map(String).join(' '))
    .join('\n')
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...VEHICLE_TEMPLATE_ENV, ...PARTS_TEMPLATE_ENV })) {
    vi.stubEnv(key, value)
  }
  fetchMock = vi.fn().mockResolvedValue(okResponse())
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(sendVehicleRequestAdminEmail).mockClear()
  vi.mocked(sendVehicleRequestCustomerEmail).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('buildWantedVehicleSummary', () => {
  it('joins make, model and the year range', () => {
    expect(buildWantedVehicleSummary(buildVehicleNotificationData('whatsapp').vehicle)).toBe('Toyota RAV4 2018–2021')
  })

  it('drops missing parts', () => {
    const vehicle = { ...buildVehicleNotificationData('whatsapp').vehicle, model: '', yearFrom: 2019, yearTo: null }
    expect(buildWantedVehicleSummary(vehicle)).toBe('Toyota 2019+')
  })
})

describe('sendVehicleRequestWhatsAppConfirmation', () => {
  it('sends the FR vehicle template to the normalized number with parameters in order', async () => {
    const result = await sendVehicleRequestWhatsAppConfirmation(buildVehicleNotificationData('whatsapp'))

    expect(result).toEqual({ ok: true, messageId: 'wamid.VR' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v23.0/123456789012345/messages')
    const body = JSON.parse(init.body)
    expect(body.to).toBe('221771234567')
    expect(body.template.name).toBe('dakar_vehicle_request_received_fr')
    expect(body.template.language).toEqual({ code: 'fr' })
    expect(body.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Awa Diop' },
      { type: 'text', text: 'VR-2026-000123' },
      { type: 'text', text: 'Toyota RAV4 2018–2021' },
      { type: 'text', text: 'https://dakarauto.example/track/7a3b1c2d-0000-4000-8000-000000000000' },
    ])
  })

  it('uses the EN vehicle template for an English request', async () => {
    await sendVehicleRequestWhatsAppConfirmation({ ...buildVehicleNotificationData('whatsapp'), locale: 'en' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.template.name).toBe('dakar_vehicle_request_received_en')
    expect(body.template.language).toEqual({ code: 'en' })
  })

  it('is a safe no-op when the vehicle template is not configured', async () => {
    vi.stubEnv('WHATSAPP_VEHICLE_TEMPLATE_NAME_FR', '')

    await expect(sendVehicleRequestWhatsAppConfirmation(buildVehicleNotificationData('whatsapp'))).resolves.toEqual({
      ok: false,
      reason: 'disabled',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loggedText()).toContain('WHATSAPP_VEHICLE_TEMPLATE_NAME_FR')
    expect(loggedText()).not.toContain(TOKEN)
  })

  it('a missing vehicle template does not disable the parts confirmation', async () => {
    for (const key of Object.keys(VEHICLE_TEMPLATE_ENV)) vi.stubEnv(key, '')

    const result = await sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp'))
    expect(result.ok).toBe(true)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).template.name).toBe('dakar_request_received_fr')
  })

  it('returns a safe failure on a Meta error response and logs only the status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'secret detail' } }) })

    const result = await sendVehicleRequestWhatsAppConfirmation(buildVehicleNotificationData('whatsapp'))

    expect(result).toEqual({ ok: false, reason: 'http_error', status: 400 })
    expect(loggedText()).toContain('Customer confirmation failed for VR-2026-000123: Meta API returned 400')
    expect(loggedText()).not.toContain('secret detail')
    expect(loggedText()).not.toContain(TOKEN)
  })
})

describe('sendVehicleRequestNotifications with WhatsApp failures', () => {
  it('missing WhatsApp configuration: does not throw, no Meta call, no email fallback, admin email sent', async () => {
    for (const key of Object.keys({ ...BASE_ENV, ...VEHICLE_TEMPLATE_ENV })) vi.stubEnv(key, '')

    await expect(sendVehicleRequestNotifications(buildVehicleNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sendVehicleRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('fetch rejecting: does not throw, no email fallback, admin email sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(sendVehicleRequestNotifications(buildVehicleNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(sendVehicleRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
  })
})

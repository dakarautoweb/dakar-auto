import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNotificationData } from '@/src/services/notifications/__tests__/fixtures'

// Email is mocked so the orchestrator test below doesn't need Resend;
// WhatsApp runs for real against a mocked fetch — never the Meta API.
vi.mock('@/src/services/email', () => ({
  sendPartsRequestAdminEmail: vi.fn().mockResolvedValue(undefined),
  sendPartsRequestCustomerEmail: vi.fn().mockResolvedValue(undefined),
}))

import { sendPartsRequestAdminEmail } from '@/src/services/email'
import { sendPartsRequestNotifications } from '@/src/services/notifications/send-parts-request-notifications'
import { sendPartsRequestWhatsAppConfirmation } from '../send-parts-request-confirmation'

const TOKEN = 'test-token-never-logged'

const ENV = {
  WHATSAPP_CLOUD_API_TOKEN: TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
  WHATSAPP_GRAPH_API_VERSION: 'v23.0',
  WHATSAPP_TEMPLATE_NAME_FR: 'dakar_request_received_fr',
  WHATSAPP_TEMPLATE_LANGUAGE_FR: 'fr',
  WHATSAPP_TEMPLATE_NAME_EN: 'dakar_request_received_en',
  WHATSAPP_TEMPLATE_LANGUAGE_EN: 'en',
}

function okResponse() {
  return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.ABC' }] }) }
}

function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.map((args) => args.map(String).join(' '))
    .join('\n')
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
  fetchMock = vi.fn().mockResolvedValue(okResponse())
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sendPartsRequestWhatsAppConfirmation', () => {
  it('sends the FR template to the normalized number with parameters in order', async () => {
    const result = await sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp'))

    expect(result).toEqual({ ok: true, messageId: 'wamid.ABC' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v23.0/123456789012345/messages')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`)
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '221771234567',
      type: 'template',
      template: {
        name: 'dakar_request_received_fr',
        language: { code: 'fr' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Awa Diop' },
              { type: 'text', text: 'DA-2026-000123' },
              { type: 'text', text: '2018 Toyota Corolla' },
              { type: 'text', text: 'https://dakarauto.example/track/2f1c9a3e-0000-4000-8000-000000000000' },
            ],
          },
        ],
      },
    })
  })

  it('uses the EN template for an English request', async () => {
    await sendPartsRequestWhatsAppConfirmation({ ...buildNotificationData('whatsapp'), locale: 'en' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.template.name).toBe('dakar_request_received_en')
    expect(body.template.language).toEqual({ code: 'en' })
  })

  it('uses the separate WhatsApp number when one was given', async () => {
    await sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp', { whatsappPhone: '+1 514 555 1234' }))

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe('15145551234')
  })

  it('sends a placeholder when the vehicle summary would be empty', async () => {
    const data = { ...buildNotificationData('whatsapp'), vehicle: { vin: null, year: null, make: '', model: '' } }
    await sendPartsRequestWhatsAppConfirmation(data)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).template.components[0].parameters[2]).toEqual({ type: 'text', text: '—' })
  })

  it('is a safe no-op when configuration is incomplete', async () => {
    vi.stubEnv('WHATSAPP_CLOUD_API_TOKEN', '')

    await expect(sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp'))).resolves.toEqual({
      ok: false,
      reason: 'disabled',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loggedText()).toContain('WHATSAPP_CLOUD_API_TOKEN')
  })

  it('does not call Meta for a local number without a country code', async () => {
    const result = await sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp', { whatsappPhone: '77 123 45 67' }))

    expect(result).toEqual({ ok: false, reason: 'invalid_recipient' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a safe failure on a Meta error response and logs only the status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'secret detail', fbtrace_id: 'x' } }) })

    const result = await sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp'))

    expect(result).toEqual({ ok: false, reason: 'http_error', status: 400 })
    expect(loggedText()).toContain('Meta API returned 400')
    expect(loggedText()).not.toContain('secret detail')
    expect(loggedText()).not.toContain(TOKEN)
  })

  it('returns a safe failure when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp'))).resolves.toEqual({
      ok: false,
      reason: 'network_error',
    })
    expect(loggedText()).not.toContain(TOKEN)
  })

  it('reports a timeout distinctly', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))

    await expect(sendPartsRequestWhatsAppConfirmation(buildNotificationData('whatsapp'))).resolves.toEqual({
      ok: false,
      reason: 'timeout',
    })
  })
})

describe('sendPartsRequestNotifications with missing WhatsApp configuration', () => {
  it('does not throw, does not call Meta, and still sends the admin email', async () => {
    for (const key of Object.keys(ENV)) vi.stubEnv(key, '')

    await expect(sendPartsRequestNotifications(buildNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })
})

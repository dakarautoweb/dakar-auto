import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNotificationData } from './fixtures'

// Both delivery modules are mocked — these tests only check routing and
// isolation, never a real Resend or Meta call.
const { sendPartsRequestAdminEmail, sendPartsRequestCustomerEmail, sendPartsRequestWhatsAppConfirmation } = vi.hoisted(() => ({
  sendPartsRequestAdminEmail: vi.fn(),
  sendPartsRequestCustomerEmail: vi.fn(),
  sendPartsRequestWhatsAppConfirmation: vi.fn(),
}))

vi.mock('@/src/services/email', () => ({ sendPartsRequestAdminEmail, sendPartsRequestCustomerEmail }))
vi.mock('@/src/services/whatsapp/send-parts-request-confirmation', () => ({ sendPartsRequestWhatsAppConfirmation }))

import { sendPartsRequestNotifications } from '../send-parts-request-notifications'

beforeEach(() => {
  sendPartsRequestAdminEmail.mockReset().mockResolvedValue(undefined)
  sendPartsRequestCustomerEmail.mockReset().mockResolvedValue(undefined)
  sendPartsRequestWhatsAppConfirmation.mockReset().mockResolvedValue({ ok: true, messageId: 'wamid.1' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sendPartsRequestNotifications routing', () => {
  it('whatsapp → WhatsApp confirmation once, no customer email, admin email sent', async () => {
    const data = buildNotificationData('whatsapp')
    await sendPartsRequestNotifications(data)

    expect(sendPartsRequestWhatsAppConfirmation).toHaveBeenCalledTimes(1)
    expect(sendPartsRequestWhatsAppConfirmation).toHaveBeenCalledWith(data)
    expect(sendPartsRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('whatsapp with an email address on file still sends no customer email', async () => {
    await sendPartsRequestNotifications(buildNotificationData('whatsapp', { email: 'awa@example.com' }))

    expect(sendPartsRequestCustomerEmail).not.toHaveBeenCalled()
  })

  it('email → customer email, no WhatsApp, admin email sent', async () => {
    const data = buildNotificationData('email')
    await sendPartsRequestNotifications(data)

    expect(sendPartsRequestCustomerEmail).toHaveBeenCalledTimes(1)
    expect(sendPartsRequestCustomerEmail).toHaveBeenCalledWith(data)
    expect(sendPartsRequestWhatsAppConfirmation).not.toHaveBeenCalled()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('phone → no automatic customer confirmation, admin email sent', async () => {
    await sendPartsRequestNotifications(buildNotificationData('phone'))

    expect(sendPartsRequestWhatsAppConfirmation).not.toHaveBeenCalled()
    expect(sendPartsRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })
})

describe('sendPartsRequestNotifications isolation', () => {
  it('a rejected WhatsApp send does not throw and admin email is still attempted', async () => {
    sendPartsRequestWhatsAppConfirmation.mockRejectedValue(new Error('boom'))

    await expect(sendPartsRequestNotifications(buildNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('a synchronously throwing WhatsApp send does not throw either', async () => {
    sendPartsRequestWhatsAppConfirmation.mockImplementation(() => {
      throw new Error('sync boom')
    })

    await expect(sendPartsRequestNotifications(buildNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('an unsuccessful WhatsApp result does not fall back to email', async () => {
    sendPartsRequestWhatsAppConfirmation.mockResolvedValue({ ok: false, reason: 'http_error', status: 400 })

    await sendPartsRequestNotifications(buildNotificationData('whatsapp'))
    expect(sendPartsRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('a failed customer email does not suppress the admin email', async () => {
    sendPartsRequestCustomerEmail.mockRejectedValue(new Error('resend down'))

    await expect(sendPartsRequestNotifications(buildNotificationData('email'))).resolves.toBeUndefined()
    expect(sendPartsRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('a failed admin email does not suppress the customer confirmation', async () => {
    sendPartsRequestAdminEmail.mockRejectedValue(new Error('resend down'))

    await expect(sendPartsRequestNotifications(buildNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(sendPartsRequestWhatsAppConfirmation).toHaveBeenCalledTimes(1)
  })

  it('logs failures without the error object', async () => {
    sendPartsRequestWhatsAppConfirmation.mockRejectedValue(new Error('boom'))

    await sendPartsRequestNotifications(buildNotificationData('whatsapp'))
    expect(console.error).toHaveBeenCalledWith('[notifications] customer WhatsApp for DA-2026-000123 threw: boom')
  })
})

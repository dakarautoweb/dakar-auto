import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildVehicleNotificationData } from './fixtures'

// Both delivery modules are mocked — these tests only check routing and
// isolation, never a real Resend or Meta call.
const { sendVehicleRequestAdminEmail, sendVehicleRequestCustomerEmail, sendVehicleRequestWhatsAppConfirmation } = vi.hoisted(() => ({
  sendVehicleRequestAdminEmail: vi.fn(),
  sendVehicleRequestCustomerEmail: vi.fn(),
  sendVehicleRequestWhatsAppConfirmation: vi.fn(),
}))

vi.mock('@/src/services/email', () => ({ sendVehicleRequestAdminEmail, sendVehicleRequestCustomerEmail }))
vi.mock('@/src/services/whatsapp/send-vehicle-request-confirmation', () => ({ sendVehicleRequestWhatsAppConfirmation }))

import { sendVehicleRequestNotifications } from '../send-vehicle-request-notifications'

beforeEach(() => {
  sendVehicleRequestAdminEmail.mockReset().mockResolvedValue(undefined)
  sendVehicleRequestCustomerEmail.mockReset().mockResolvedValue(undefined)
  sendVehicleRequestWhatsAppConfirmation.mockReset().mockResolvedValue({ ok: true, messageId: 'wamid.1' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sendVehicleRequestNotifications routing', () => {
  it('whatsapp → WhatsApp confirmation once, no customer email, admin email once', async () => {
    const data = buildVehicleNotificationData('whatsapp')
    await sendVehicleRequestNotifications(data)

    expect(sendVehicleRequestWhatsAppConfirmation).toHaveBeenCalledTimes(1)
    expect(sendVehicleRequestWhatsAppConfirmation).toHaveBeenCalledWith(data)
    expect(sendVehicleRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('whatsapp with an email address on file still sends no customer email', async () => {
    await sendVehicleRequestNotifications(buildVehicleNotificationData('whatsapp', { email: 'awa@example.com' }))

    expect(sendVehicleRequestCustomerEmail).not.toHaveBeenCalled()
  })

  it('email → customer email once, no WhatsApp, admin email once', async () => {
    const data = buildVehicleNotificationData('email')
    await sendVehicleRequestNotifications(data)

    expect(sendVehicleRequestCustomerEmail).toHaveBeenCalledTimes(1)
    expect(sendVehicleRequestCustomerEmail).toHaveBeenCalledWith(data)
    expect(sendVehicleRequestWhatsAppConfirmation).not.toHaveBeenCalled()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('phone → no automatic customer confirmation, admin email once', async () => {
    await sendVehicleRequestNotifications(buildVehicleNotificationData('phone'))

    expect(sendVehicleRequestWhatsAppConfirmation).not.toHaveBeenCalled()
    expect(sendVehicleRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
  })
})

describe('sendVehicleRequestNotifications isolation', () => {
  it('a rejected WhatsApp send does not throw and admin email is still attempted', async () => {
    sendVehicleRequestWhatsAppConfirmation.mockRejectedValue(new Error('boom'))

    await expect(sendVehicleRequestNotifications(buildVehicleNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith('[notifications] customer WhatsApp for VR-2026-000123 threw: boom')
  })

  it('an unsuccessful WhatsApp result does not fall back to email', async () => {
    sendVehicleRequestWhatsAppConfirmation.mockResolvedValue({ ok: false, reason: 'http_error', status: 400 })

    await expect(sendVehicleRequestNotifications(buildVehicleNotificationData('whatsapp'))).resolves.toBeUndefined()
    expect(sendVehicleRequestCustomerEmail).not.toHaveBeenCalled()
    expect(sendVehicleRequestAdminEmail).toHaveBeenCalledTimes(1)
  })

  it('a failed admin email does not suppress the customer confirmation', async () => {
    sendVehicleRequestAdminEmail.mockRejectedValue(new Error('resend down'))

    await expect(sendVehicleRequestNotifications(buildVehicleNotificationData('email'))).resolves.toBeUndefined()
    expect(sendVehicleRequestCustomerEmail).toHaveBeenCalledTimes(1)
  })
})

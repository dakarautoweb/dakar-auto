import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('GET /api/whatsapp/webhook', () => {
  it('returns the Meta challenge when mode and verify token match', async () => {
    vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'server-only-verify-token')
    const request = new Request(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=server-only-verify-token&hub.challenge=challenge-123'
    )

    const response = GET(request)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('challenge-123')
  })

  it('returns 403 when the supplied verify token does not match', async () => {
    vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'server-only-verify-token')
    const request = new Request(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge-123'
    )

    const response = GET(request)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden')
  })
})

describe('POST /api/whatsapp/webhook', () => {
  it('logs only the allowlisted fields for a failed delivery status and responds 200', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const request = new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      headers: {
        authorization: 'Bearer must-never-be-logged',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        access_token: 'payload-token-must-never-be-logged',
        entry: [
          {
            id: 'business-account-id-not-needed',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '+1 514 582 0204' },
                  messages: [{ id: 'incoming-message-is-ignored', text: { body: 'private message body' } }],
                  statuses: [
                    {
                      id: 'wamid.failed-123',
                      status: 'failed',
                      recipient_id: '15145820204',
                      timestamp: '1791158400',
                      conversation: { id: 'ignored-conversation' },
                      errors: [
                        {
                          code: 131026,
                          title: 'Message undeliverable',
                          message: 'Message undeliverable',
                          error_data: { details: 'The recipient could not receive the message.' },
                          href: 'ignored-error-link',
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('EVENT_RECEIVED')
    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith('[whatsapp-webhook] delivery status', {
      message_id: 'wamid.failed-123',
      status: 'failed',
      recipient_id: '15145820204',
      timestamp: '1791158400',
      errors: [
        {
          code: 131026,
          title: 'Message undeliverable',
          message: 'Message undeliverable',
          details: 'The recipient could not receive the message.',
        },
      ],
    })
  })
})

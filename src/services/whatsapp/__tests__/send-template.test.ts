import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeTemplateText, sendWhatsAppTemplate } from '../send-template'
import type { WhatsAppConfig } from '../config'

const config: WhatsAppConfig = {
  token: 'test-token-never-log',
  phoneNumberId: '12345',
  graphApiVersion: 'v23.0',
  templates: { fr: { name: 'template_fr', language: 'fr' }, en: { name: 'template_en', language: 'en' } },
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.test' }] }) })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

async function send(options: { headerImageUrl?: string; urlButtonParameter?: string } = {}) {
  return sendWhatsAppTemplate({
    config,
    to: '221771234567',
    template: config.templates.fr,
    bodyParameters: [' Awa\nDiop ', 'VR-1'],
    ...options,
  })
}

function components() {
  return JSON.parse(fetchMock.mock.calls[0][1].body).template.components
}

describe('sendWhatsAppTemplate components', () => {
  it('builds body only and sanitizes body text', async () => {
    await send()
    expect(components()).toEqual([{ type: 'body', parameters: [{ type: 'text', text: 'Awa Diop' }, { type: 'text', text: 'VR-1' }] }])
  })

  it('builds body plus image header', async () => {
    await send({ headerImageUrl: 'https://example.test/car.jpg' })
    expect(components().map((component: { type: string }) => component.type)).toEqual(['header', 'body'])
    expect(components()[0].parameters[0]).toEqual({ type: 'image', image: { link: 'https://example.test/car.jpg' } })
  })

  it('builds body plus dynamic URL button', async () => {
    await send({ urlButtonParameter: ' token\nvalue ' })
    expect(components().map((component: { type: string }) => component.type)).toEqual(['body', 'button'])
    expect(components()[1]).toEqual({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'token value' }] })
  })

  it('builds body, image and URL button', async () => {
    await send({ headerImageUrl: 'https://example.test/car.jpg', urlButtonParameter: 'tracking-token' })
    expect(components().map((component: { type: string }) => component.type)).toEqual(['header', 'body', 'button'])
  })

  it('sanitizes blank and repeated whitespace parameters', () => {
    expect(sanitizeTemplateText('\n\t')).toBe('—')
    expect(sanitizeTemplateText('a    b')).toBe('a b')
  })

  it('returns a safe Meta HTTP error without reading the body', async () => {
    const json = vi.fn()
    fetchMock.mockResolvedValue({ ok: false, status: 400, json })
    await expect(send()).resolves.toEqual({ ok: false, reason: 'http_error', status: 400 })
    expect(json).not.toHaveBeenCalled()
  })

  it('distinguishes timeout and network errors', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'))
    await expect(send()).resolves.toEqual({ ok: false, reason: 'timeout' })
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(send()).resolves.toEqual({ ok: false, reason: 'network_error' })
  })
})

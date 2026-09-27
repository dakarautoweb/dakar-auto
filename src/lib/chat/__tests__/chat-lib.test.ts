import { describe, expect, it } from 'vitest'
import { buildAiHistory, MAX_HISTORY_MESSAGES } from '../history'
import { REDACTED, redactPii } from '../redact'
import { CHAT_ROUTES, resolveActionHref, sanitizePathname } from '../routes'
import type { ChatMessage } from '../types'

describe('redactPii', () => {
  it('redacts email addresses', () => {
    expect(redactPii('Mon email est Sophie.Diallo+auto@gmail.com merci')).toBe(`Mon email est ${REDACTED.email} merci`)
  })

  it.each(['+221 77 123 45 67', '00221771234567', '771234567', '77-123-45-67 ', '(+1) 514 555 1234'])('redacts the phone number %s', (phone) => {
    const out = redactPii(`Appelez-moi au ${phone}`)
    expect(out).toContain(REDACTED.phone)
    expect(out.replace(/\D/g, '')).toBe('')
  })

  it('redacts VIN-like 17-character values, any case', () => {
    expect(redactPii('VIN: 1HGCM82633A004352')).toBe(`VIN: ${REDACTED.vin}`)
    expect(redactPii('mon vin jtdkb20u093512345 svp')).toBe(`mon vin ${REDACTED.vin} svp`)
  })

  it('redacts tracking tokens (UUIDs)', () => {
    expect(redactPii('/track/3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c')).toBe(`/track/${REDACTED.token}`)
  })

  it('keeps ordinary car talk intact', () => {
    const text = 'Alternateur pour Toyota Corolla 2019, modèles 2015-2019, budget 15 000 000 FCFA, 120000 km, DA-2026-000183'
    expect(redactPii(text)).toBe(text)
  })

  it('does not treat a 17-letter word as a VIN', () => {
    expect(redactPii('ABCDEFGHJKLMNPRST')).toBe('ABCDEFGHJKLMNPRST')
  })
})

describe('sanitizePathname', () => {
  it('accepts known public pages', () => {
    expect(sanitizePathname('/vehicle/identify')).toBe('/vehicle/identify')
    expect(sanitizePathname('/')).toBe('/')
    expect(sanitizePathname('/faq/')).toBe('/faq')
  })

  it('strips query strings and fragments', () => {
    expect(sanitizePathname('/vehicle/identify?vin=1HGCM82633A004352')).toBe('/vehicle/identify')
    expect(sanitizePathname('/vehicles#top')).toBe('/vehicles')
  })

  it('collapses dynamic segments so tokens and ids never leave the browser', () => {
    expect(sanitizePathname('/track/3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c')).toBe('/track/[token]')
    expect(sanitizePathname('/vehicles/abc')).toBe('/vehicles/[id]')
  })

  it('rejects unknown, admin, external and malformed paths', () => {
    expect(sanitizePathname('/admin/requests')).toBeNull()
    expect(sanitizePathname('https://evil.example/x')).toBeNull()
    expect(sanitizePathname('//evil.example')).toBeNull()
    expect(sanitizePathname(42)).toBeNull()
    expect(sanitizePathname(`/${'a'.repeat(300)}`)).toBeNull()
  })
})

describe('resolveActionHref', () => {
  const vehicleId = '3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c'

  it('accepts every allowlisted route', () => {
    for (const href of Object.values(CHAT_ROUTES)) expect(resolveActionHref(href)).toBe(href)
  })

  it('accepts a vehicle page only for a vehicle returned by the search', () => {
    expect(resolveActionHref(`/vehicles/${vehicleId}`, new Set([vehicleId]))).toBe(`/vehicles/${vehicleId}`)
    expect(resolveActionHref(`/vehicles/${vehicleId}`)).toBeNull()
  })

  it.each([
    'https://evil.example',
    '//evil.example/track',
    'javascript:alert(1)',
    '/admin',
    '/track?token=x',
    '/vehicle/identify?vin=1HGCM82633A004352',
    '/track/3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c',
    '/vehicles/not-a-uuid',
    null,
  ])('rejects %s', (href) => {
    expect(resolveActionHref(href, new Set([vehicleId]))).toBeNull()
  })
})

describe('buildAiHistory', () => {
  function msg(id: number, extra: Partial<ChatMessage> = {}): ChatMessage {
    return { id: `m${id}`, role: id % 2 ? 'user' : 'assistant', content: `message ${id}`, ...extra }
  }

  it(`caps the history at ${MAX_HISTORY_MESSAGES} most recent messages`, () => {
    const history = buildAiHistory(Array.from({ length: 25 }, (_, i) => msg(i + 1)))
    expect(history).toHaveLength(MAX_HISTORY_MESSAGES)
    expect(history[history.length - 1].content).toBe('message 25')
  })

  it('never includes recovery-flow messages, failed turns or the welcome bubble', () => {
    const history = buildAiHistory([
      { id: 'welcome', role: 'assistant', content: 'Bonjour' },
      msg(1),
      { id: 'r1', role: 'user', content: 'sophie@gmail.com', channel: 'recovery' },
      { id: 'r2', role: 'user', content: 'Diallo', channel: 'recovery' },
      { id: 'r3', role: 'assistant', content: 'Demande retrouvée\nDA-2026-000183\nToyota RAV4 2020', channel: 'recovery' },
      { id: 'done', role: 'assistant', content: 'Récupération de demande terminée.' },
      { id: 'f', role: 'assistant', content: 'indisponible', failed: true },
    ])
    expect(history).toEqual([
      { role: 'user', content: 'message 1' },
      { role: 'assistant', content: 'Récupération de demande terminée.' },
    ])
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APIConnectionTimeoutError, APIUserAbortError, InternalServerError, RateLimitError } from 'openai'
import type { PublicVehicleSummary } from '@/src/services/inventory/types'
import { buildAiHistory } from '@/src/lib/chat/history'
import type { ChatMessage } from '@/src/lib/chat/types'

// The OpenAI client is replaced by a mock — no test ever reaches the real
// API. The SDK's own error classes are kept so error mapping is realistic.
const { createMock, constructorOptions } = vi.hoisted(() => ({
  createMock: vi.fn(),
  constructorOptions: [] as unknown[],
}))

vi.mock('openai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('openai')>()
  class MockOpenAI {
    static APIError = actual.APIError
    static APIConnectionTimeoutError = actual.APIConnectionTimeoutError
    static RateLimitError = actual.RateLimitError
    responses = { create: createMock }
    constructor(options: unknown) {
      constructorOptions.push(options)
    }
  }
  return { ...actual, default: MockOpenAI }
})

import { generateAssistantReply, validateAssistantReply } from '../respond'

const API_KEY = 'sk-test-key-never-logged'
const VEHICLE_ID = '3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c'

function completed(output: unknown) {
  const text = typeof output === 'string' ? output : JSON.stringify(output)
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], output_text: text }
}

function toolCall(args: Record<string, unknown>) {
  return {
    status: 'completed',
    output: [{ type: 'function_call', call_id: 'call_1', name: 'search_public_vehicles', arguments: JSON.stringify(args) }],
    output_text: '',
  }
}

const reply = (overrides: Record<string, unknown> = {}) => ({
  message: 'Pour quel véhicule ?',
  intent: 'parts_help',
  action: { type: 'link', href: '/vehicle/identify' },
  ...overrides,
})

const CRV: PublicVehicleSummary = {
  id: VEHICLE_ID,
  make: 'Honda',
  model: 'CR-V',
  year: 2019,
  mileage: 80000,
  engineDisplacement: '2.4L',
  transmission: 'Automatique',
  color: 'Gris',
  price: 12500000,
  currency: 'XOF',
  status: 'available',
  primaryPhotoUrl: 'https://storage.example/photo.jpg',
}

function input(overrides: Partial<Parameters<typeof generateAssistantReply>[0]> = {}) {
  return {
    history: [{ role: 'user' as const, content: 'Je cherche un alternateur.' }],
    locale: 'fr' as const,
    pathname: '/vehicle/identify',
    knowledge: 'KNOWLEDGE-BLOCK',
    loadVehicles: vi.fn(async () => [CRV]),
    ...overrides,
  }
}

function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.map((args) => args.map(String).join(' '))
    .join('\n')
}

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', API_KEY)
  vi.stubEnv('OPENAI_CHAT_MODEL', '')
  createMock.mockReset().mockResolvedValue(completed(reply()))
  constructorOptions.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('generateAssistantReply — request', () => {
  it('returns a validated reply for a normal question', async () => {
    await expect(generateAssistantReply(input())).resolves.toEqual({
      ok: true,
      reply: { message: 'Pour quel véhicule ?', intent: 'parts_help', action: { type: 'link', href: '/vehicle/identify' } },
    })
  })

  it('uses the Responses API with the default model, strict structured output, no retries, store: false and only the inventory tool', async () => {
    await generateAssistantReply(input())
    expect(constructorOptions[0]).toMatchObject({ apiKey: API_KEY, maxRetries: 0, timeout: 20_000 })
    const [params] = createMock.mock.calls[0]
    expect(params.model).toBe('gpt-6-sol')
    expect(params.store).toBe(false)
    expect(params.text.format).toMatchObject({ type: 'json_schema', strict: true })
    expect(params.tools.map((t: { type: string; name: string }) => `${t.type}:${t.name}`)).toEqual(['function:search_public_vehicles'])
    expect(JSON.stringify(params.tools)).not.toMatch(/web_search|file_search|code_interpreter/)
  })

  it('honours OPENAI_CHAT_MODEL', async () => {
    vi.stubEnv('OPENAI_CHAT_MODEL', 'gpt-custom')
    await generateAssistantReply(input())
    expect(createMock.mock.calls[0][0].model).toBe('gpt-custom')
  })

  it('sends the locale, safe pathname and public knowledge in the instructions', async () => {
    await generateAssistantReply(input({ locale: 'en', pathname: '/track/[token]' }))
    const { instructions } = createMock.mock.calls[0][0]
    expect(instructions).toContain('Reply in English')
    expect(instructions).toContain('/track/[token]')
    expect(instructions).toContain('KNOWLEDGE-BLOCK')
  })

  it('redacts emails, phones and VINs before the conversation reaches the provider', async () => {
    await generateAssistantReply(
      input({
        history: [{ role: 'user', content: 'moi: sophie@gmail.com, +221 77 123 45 67, VIN 1HGCM82633A004352' }],
      }),
    )
    const sent = JSON.stringify(createMock.mock.calls[0][0].input)
    expect(sent).not.toContain('sophie@gmail.com')
    expect(sent).not.toContain('77 123 45 67')
    expect(sent).not.toContain('1HGCM82633A004352')
    expect(sent).toContain('[EMAIL]')
    expect(sent).toContain('[PHONE]')
    expect(sent).toContain('[VIN]')
  })
})

describe('generateAssistantReply — actions', () => {
  it('drops a model-provided external or unknown href', async () => {
    createMock.mockResolvedValue(completed(reply({ action: { type: 'link', href: 'https://evil.example/pay' } })))
    const result = await generateAssistantReply(input())
    expect(result).toMatchObject({ ok: true, reply: { action: null } })
  })

  it('searches the real published inventory and allows a link to a returned vehicle only', async () => {
    const loadVehicles = vi.fn(async () => [CRV, { ...CRV, id: '00000000-0000-4000-8000-000000000000', make: 'Toyota', model: 'RAV4' }])
    createMock
      .mockResolvedValueOnce(toolCall({ make: 'honda', model: 'crv', min_year: null, max_year: null, max_price: null, transmission: 'automatic' }))
      .mockResolvedValueOnce(completed(reply({ message: 'Oui, un Honda CR-V 2019 est publié.', intent: 'available_vehicles', action: { type: 'link', href: `/vehicles/${VEHICLE_ID}` } })))

    const result = await generateAssistantReply(input({ history: [{ role: 'user', content: 'Vous avez un Honda CR-V ?' }], loadVehicles }))

    expect(result).toEqual({
      ok: true,
      reply: { message: 'Oui, un Honda CR-V 2019 est publié.', intent: 'available_vehicles', action: { type: 'link', href: `/vehicles/${VEHICLE_ID}` } },
    })
    expect(loadVehicles).toHaveBeenCalledTimes(1)
    const secondInput = createMock.mock.calls[1][0].input as { type?: string; output?: string }[]
    const toolOutput = JSON.parse(secondInput.find((i) => i.type === 'function_call_output')!.output!)
    expect(toolOutput.matches).toBe(1)
    expect(toolOutput.vehicles[0]).toMatchObject({ make: 'Honda', model: 'CR-V', price: 12500000, page: `/vehicles/${VEHICLE_ID}` })
    // Public fields only.
    expect(JSON.stringify(toolOutput)).not.toMatch(/vin|primaryPhotoUrl|storage/)
  })

  it('rejects a vehicle link the search did not return', async () => {
    createMock.mockResolvedValue(completed(reply({ action: { type: 'link', href: `/vehicles/${VEHICLE_ID}` } })))
    expect(await generateAssistantReply(input())).toMatchObject({ ok: true, reply: { action: null } })
  })

  it('reports zero matches honestly when nothing is published', async () => {
    createMock
      .mockResolvedValueOnce(toolCall({ make: 'Lamborghini', model: null, min_year: null, max_year: null, max_price: null, transmission: null }))
      .mockResolvedValueOnce(completed(reply({ intent: 'vehicle_sourcing', action: { type: 'link', href: '/source-a-vehicle' } })))
    await generateAssistantReply(input())
    const secondInput = createMock.mock.calls[1][0].input as { type?: string; output?: string }[]
    expect(JSON.parse(secondInput.find((i) => i.type === 'function_call_output')!.output!)).toEqual({ matches: 0, vehicles: [] })
  })

  it('forces the secure recovery action for a lost request', async () => {
    createMock.mockResolvedValue(completed(reply({ intent: 'lost_request', action: { type: 'link', href: '/track' } })))
    expect(await generateAssistantReply(input())).toMatchObject({ ok: true, reply: { intent: 'lost_request', action: { type: 'start_recovery' } } })
  })

  it('forbids tools on the last round', async () => {
    createMock.mockResolvedValue(toolCall({ make: null, model: null, min_year: null, max_year: null, max_price: null, transmission: null }))
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'invalid_result' })
    const calls = createMock.mock.calls.map(([p]) => p.tool_choice)
    expect(calls).toEqual(['auto', 'auto', 'none'])
  })
})

describe('generateAssistantReply — errors', () => {
  it('missing API key → not_configured, no provider call', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'not_configured' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('timeout', async () => {
    createMock.mockRejectedValue(new APIConnectionTimeoutError())
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'timeout' })
  })

  it('429 from the provider', async () => {
    createMock.mockRejectedValue(new RateLimitError(429, { message: 'Rate limit reached for key sk-leaked' }, 'Rate limit', new Headers()))
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'rate_limited' })
  })

  it('provider failure is sanitized: no provider message, key or conversation in the logs', async () => {
    createMock.mockRejectedValue(new InternalServerError(500, { message: 'internal detail about sk-test-key-never-logged' }, 'boom', new Headers()))
    const result = await generateAssistantReply(input({ history: [{ role: 'user', content: 'SECRET-CUSTOMER-TEXT' }] }))
    expect(result).toEqual({ ok: false, error: 'provider_error' })
    const logs = loggedText()
    expect(logs).toContain('InternalServerError 500')
    expect(logs).not.toContain(API_KEY)
    expect(logs).not.toContain('internal detail')
    expect(logs).not.toContain('SECRET-CUSTOMER-TEXT')
  })

  it('aborted by the customer', async () => {
    const controller = new AbortController()
    controller.abort()
    createMock.mockRejectedValue(new APIUserAbortError())
    expect(await generateAssistantReply(input({ signal: controller.signal }))).toEqual({ ok: false, error: 'aborted' })
  })

  it.each([
    ['unparseable output', 'not json'],
    ['empty message', { message: '  ', intent: 'general', action: { type: 'none', href: null } }],
    ['wrong shape', { text: 'hello' }],
  ])('invalid structured response (%s)', async (_label, output) => {
    createMock.mockResolvedValue(completed(output))
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'invalid_result' })
  })

  it('refusal and incomplete responses', async () => {
    createMock.mockResolvedValue({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }], output_text: '' })
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'invalid_result' })
    createMock.mockResolvedValue({ status: 'incomplete', output: [], output_text: '' })
    expect(await generateAssistantReply(input())).toEqual({ ok: false, error: 'invalid_result' })
  })
})

describe('validateAssistantReply', () => {
  it('falls back to "general" for an unknown intent and null for "none"', () => {
    expect(validateAssistantReply({ message: 'ok', intent: 'hack', action: { type: 'none', href: null } }, new Set())).toEqual({
      message: 'ok',
      intent: 'general',
      action: null,
    })
  })
})

describe('privacy boundary — recovery never reaches the provider', () => {
  it('recovery inputs and the recovered request are not in the AI history or provider input', async () => {
    const thread: ChatMessage[] = [
      { id: 'welcome', role: 'assistant', content: 'Bonjour' },
      { id: '1', role: 'user', content: 'J’ai perdu ma demande', channel: 'recovery' },
      { id: '2', role: 'assistant', content: 'Quel email ou numéro de téléphone ?', channel: 'recovery' },
      { id: '3', role: 'user', content: 'sophie.diallo@gmail.com', channel: 'recovery' },
      { id: '4', role: 'user', content: 'Diallo', channel: 'recovery' },
      { id: '5', role: 'user', content: 'Code saisi', channel: 'recovery' },
      { id: '6', role: 'assistant', content: 'Demande retrouvée\nDA-2026-000183\nToyota RAV4 2020\nStatut : En cours de traitement', channel: 'recovery' },
      { id: '7', role: 'assistant', content: 'Récupération de demande terminée.' },
      { id: '8', role: 'user', content: 'Merci ! Et pour un alternateur ?' },
    ]
    await generateAssistantReply(input({ history: buildAiHistory(thread) }))
    const [params] = createMock.mock.calls[0]
    const sent = JSON.stringify({ input: params.input, instructions: params.instructions })
    for (const secret of ['sophie.diallo@gmail.com', 'Diallo', 'DA-2026-000183', 'Toyota RAV4', 'En cours de traitement', 'Code saisi']) {
      expect(sent).not.toContain(secret)
    }
    expect(params.input).toEqual([
      { role: 'assistant', content: 'Récupération de demande terminée.' },
      { role: 'user', content: 'Merci ! Et pour un alternateur ?' },
    ])
  })
})

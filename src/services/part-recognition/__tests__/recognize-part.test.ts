import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APIConnectionTimeoutError, InternalServerError, RateLimitError } from 'openai'
import { JPEG_BYTES, multiplePartsOutput, PAD_CANDIDATE, PNG_BYTES, ROTOR_CANDIDATE, validModelOutput } from './fixtures'

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

import { recognizePart } from '../recognize-part'

const API_KEY = 'sk-test-key-never-logged'
const IMAGE_BASE64 = JPEG_BYTES.toString('base64')

function completedResponse(output: unknown) {
  const text = typeof output === 'string' ? output : JSON.stringify(output)
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], output_text: text }
}

function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.map((args) => args.map(String).join(' '))
    .join('\n')
}

function expectCleanLogs() {
  const logs = loggedText()
  expect(logs).not.toContain(API_KEY)
  expect(logs).not.toContain(IMAGE_BASE64)
  expect(logs).not.toContain('DAKAR-TEST-IMAGE-PAYLOAD')
  expect(logs).not.toContain('data:image')
}

const input = {
  image: { buffer: JPEG_BYTES, mime: 'image/jpeg' as const },
  locale: 'fr' as const,
  vehicle: { year: 2020, make: 'Toyota', model: 'RAV4', engine: '2.5L' },
}

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', API_KEY)
  vi.stubEnv('OPENAI_PART_RECOGNITION_MODEL', '')
  createMock.mockReset().mockResolvedValue(completedResponse(validModelOutput()))
  constructorOptions.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('recognizePart — request', () => {
  it('returns the validated result', async () => {
    await expect(recognizePart(input)).resolves.toEqual({ ok: true, result: validModelOutput() })
  })

  it('calls the Responses API once with one image, strict Structured Outputs, store: false and no tools', async () => {
    await recognizePart(input)

    expect(createMock).toHaveBeenCalledTimes(1)
    const [params] = createMock.mock.calls[0]
    expect(params.model).toBe('gpt-6-astra')
    expect(params.store).toBe(false)
    expect(params.tools).toBeUndefined()
    expect(params.text.format).toMatchObject({ type: 'json_schema', strict: true, name: 'dakar_part_recognition' })
    const images = params.input[0].content.filter((c: { type: string }) => c.type === 'input_image')
    expect(images).toEqual([{ type: 'input_image', image_url: `data:image/jpeg;base64,${IMAGE_BASE64}`, detail: 'auto' }])
    expect(params.instructions).toContain('You are an automotive-part visual classifier for Dakar Auto.')
    expect(params.instructions).toContain("Write partName (including each candidate's) and explanation in French.")
  })

  it('uses the sniffed MIME type in the data URL', async () => {
    await recognizePart({ ...input, image: { buffer: PNG_BYTES, mime: 'image/png' } })
    expect(createMock.mock.calls[0][0].input[0].content[1].image_url).toMatch(/^data:image\/png;base64,/)
  })

  it('asks for English text on the English site', async () => {
    await recognizePart({ ...input, locale: 'en' })
    expect(createMock.mock.calls[0][0].instructions).toContain("Write partName (including each candidate's) and explanation in English.")
  })

  it('sends only year/make/model/engine as vehicle context', async () => {
    await recognizePart(input)
    const text = createMock.mock.calls[0][0].input[0].content[0].text
    expect(text).toBe('Vehicle context (supporting only): 2020 Toyota RAV4, engine: 2.5L.')
  })

  it('uses OPENAI_PART_RECOGNITION_MODEL when set', async () => {
    vi.stubEnv('OPENAI_PART_RECOGNITION_MODEL', 'some-other-model')
    await recognizePart(input)
    expect(createMock.mock.calls[0][0].model).toBe('some-other-model')
  })

  it('configures a 20 s timeout and no automatic retries', async () => {
    await recognizePart(input)
    expect(constructorOptions[0]).toMatchObject({ apiKey: API_KEY, timeout: 20_000, maxRetries: 0 })
  })
})

describe('recognizePart — failures', () => {
  it('missing OPENAI_API_KEY fails safely without calling OpenAI', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'not_configured' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('a timeout maps to "timeout"', async () => {
    createMock.mockRejectedValue(new APIConnectionTimeoutError())
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'timeout' })
    expectCleanLogs()
  })

  it('HTTP 429 maps to "rate_limited"', async () => {
    createMock.mockRejectedValue(new RateLimitError(429, { message: 'quota' }, 'Rate limit reached', new Headers()))
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'rate_limited' })
  })

  it('a provider error is sanitized: generic code, no provider message, key or image in logs', async () => {
    const providerError = new InternalServerError(500, { message: `provider secret detail ${API_KEY}` }, `boom ${IMAGE_BASE64}`, new Headers())
    createMock.mockRejectedValue(providerError)

    const outcome = await recognizePart(input)

    expect(outcome).toEqual({ ok: false, error: 'provider_error' })
    expect(JSON.stringify(outcome)).not.toContain('provider secret detail')
    expect(loggedText()).toContain('[part-recognition] OpenAI request failed')
    expect(loggedText()).not.toContain('provider secret detail')
    expectCleanLogs()
  })

  it('a network failure maps to "provider_error"', async () => {
    createMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'provider_error' })
    expectCleanLogs()
  })

  it('unparseable output maps to "invalid_result"', async () => {
    createMock.mockResolvedValue(completedResponse('not json'))
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'invalid_result' })
  })

  it('an unknown category from the model maps to "invalid_result"', async () => {
    createMock.mockResolvedValue(completedResponse(validModelOutput({ category: 'brakes' })))
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'invalid_result' })
  })

  it('an incomplete response maps to "invalid_result"', async () => {
    createMock.mockResolvedValue({ ...completedResponse(validModelOutput()), status: 'incomplete' })
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'invalid_result' })
  })

  it('a refusal maps to "invalid_result"', async () => {
    createMock.mockResolvedValue({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }], output_text: '' })
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'invalid_result' })
  })

  it('a category/subcategory mismatch is returned with confirmation required', async () => {
    createMock.mockResolvedValue(completedResponse(validModelOutput({ subcategory: 'radiator' })))
    const outcome = await recognizePart(input)
    expect(outcome).toMatchObject({ ok: true, result: { category: 'braking', subcategory: null, needsConfirmation: true } })
  })
})

// The model is mocked: these check what we ask for and how each kind of
// answer comes back — never a real OpenAI call.
describe('recognizePart — multiple parts', () => {
  it('the instructions tell the model when to use multiple_parts, and that copies of one part are not', async () => {
    await recognizePart(input)
    const instructions: string = createMock.mock.calls[0][0].instructions
    expect(instructions).toContain('status "multiple_parts"')
    expect(instructions).toContain('do NOT pick one arbitrarily')
    expect(instructions).toContain('Several copies of the SAME part are still one part')
    expect(instructions).toContain('never more than 3 candidates')
    expect(createMock.mock.calls[0][0].text.format.schema.properties.candidates.maxItems).toBe(3)
  })

  it('one visible part → identified', async () => {
    await expect(recognizePart(input)).resolves.toMatchObject({ ok: true, result: { status: 'identified', candidates: [] } })
  })

  it('four spark plugs (one distinct part) → identified', async () => {
    const plugs = validModelOutput({ partName: 'Bougies d’allumage', category: 'engine', subcategory: null, needsConfirmation: true })
    createMock.mockResolvedValue(completedResponse(plugs))
    await expect(recognizePart(input)).resolves.toMatchObject({ ok: true, result: { status: 'identified', candidates: [] } })
  })

  it('brake rotors + brake pads → multiple_parts with both candidates', async () => {
    createMock.mockResolvedValue(completedResponse(multiplePartsOutput()))
    await expect(recognizePart(input)).resolves.toEqual({ ok: true, result: multiplePartsOutput() })
  })

  it('an invalid candidate category maps to "invalid_result"', async () => {
    createMock.mockResolvedValue(completedResponse(multiplePartsOutput({ candidates: [ROTOR_CANDIDATE, { ...PAD_CANDIDATE, category: 'brakes' }] })))
    await expect(recognizePart(input)).resolves.toEqual({ ok: false, error: 'invalid_result' })
  })
})

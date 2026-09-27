import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import { imageFile, JPEG_BYTES, PNG_BYTES, validModelOutput, WEBP_BYTES } from './fixtures'

// The recognition call itself is mocked — these tests cover the endpoint's
// own validation and never reach OpenAI.
const { recognizePartMock } = vi.hoisted(() => ({ recognizePartMock: vi.fn() }))
vi.mock('../recognize-part', () => ({ recognizePart: recognizePartMock }))

import { handlePartRecognitionRequest, parseVehicleContext } from '../handle-request'

function post(form: FormData, headers?: HeadersInit): Request {
  return new Request('http://localhost/api/part-recognition', { method: 'POST', body: form, headers })
}

function formWith(image?: File | string, fields: Record<string, string> = {}): FormData {
  const form = new FormData()
  if (image !== undefined) form.append('image', image)
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return form
}

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'sk-test')
  recognizePartMock.mockReset().mockResolvedValue({ ok: true, result: validModelOutput() })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/part-recognition — image validation', () => {
  it.each([
    ['JPEG', JPEG_BYTES, 'image/jpeg'],
    ['PNG', PNG_BYTES, 'image/png'],
    ['WEBP', WEBP_BYTES, 'image/webp'],
  ])('accepts a valid %s', async (_label, bytes, type) => {
    const response = await handlePartRecognitionRequest(post(formWith(imageFile(bytes, type))))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, result: validModelOutput() })
    expect(recognizePartMock).toHaveBeenCalledTimes(1)
    expect(recognizePartMock.mock.calls[0][0].image.mime).toBe(type)
  })

  it('rejects a missing image', async () => {
    const response = await handlePartRecognitionRequest(post(formWith(undefined, { locale: 'fr' })))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, error: 'missing_image' })
    expect(recognizePartMock).not.toHaveBeenCalled()
  })

  it('rejects an image sent as a plain text field', async () => {
    const response = await handlePartRecognitionRequest(post(formWith('not-a-file')))
    expect(await response.json()).toEqual({ ok: false, error: 'missing_image' })
  })

  it('rejects an empty file', async () => {
    const response = await handlePartRecognitionRequest(post(formWith(imageFile(Buffer.alloc(0), 'image/jpeg'))))
    expect(await response.json()).toEqual({ ok: false, error: 'empty_image' })
  })

  it('rejects an unsupported declared MIME type', async () => {
    const response = await handlePartRecognitionRequest(post(formWith(imageFile(JPEG_BYTES, 'image/gif', 'part.gif'))))
    expect(response.status).toBe(415)
    expect(await response.json()).toEqual({ ok: false, error: 'unsupported_type' })
  })

  it('rejects bytes that are not really an image, whatever the declared type', async () => {
    const fake = imageFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/jpeg')
    const response = await handlePartRecognitionRequest(post(formWith(fake)))
    expect(await response.json()).toEqual({ ok: false, error: 'unsupported_type' })
    expect(recognizePartMock).not.toHaveBeenCalled()
  })

  it('rejects an oversized image', async () => {
    const big = imageFile(Buffer.concat([JPEG_BYTES, Buffer.alloc(MAX_FILE_SIZE_BYTES)]), 'image/jpeg')
    const response = await handlePartRecognitionRequest(post(formWith(big)))
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ ok: false, error: 'too_large' })
    expect(recognizePartMock).not.toHaveBeenCalled()
  })

  it('rejects a declared body size over the limit before reading it', async () => {
    const response = await handlePartRecognitionRequest(
      post(formWith(imageFile(JPEG_BYTES, 'image/jpeg')), { 'content-length': String(MAX_FILE_SIZE_BYTES * 2) }),
    )
    expect(await response.json()).toEqual({ ok: false, error: 'too_large' })
  })

  it('rejects a body that is not multipart', async () => {
    const request = new Request('http://localhost/api/part-recognition', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
    const response = await handlePartRecognitionRequest(request)
    expect(await response.json()).toEqual({ ok: false, error: 'invalid_request' })
  })
})

describe('POST /api/part-recognition — configuration and errors', () => {
  it('answers not_configured (503) when OPENAI_API_KEY is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const response = await handlePartRecognitionRequest(post(formWith(imageFile(JPEG_BYTES, 'image/jpeg'))))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, error: 'not_configured' })
    expect(recognizePartMock).not.toHaveBeenCalled()
  })

  it.each([
    ['timeout', 504],
    ['rate_limited', 429],
    ['provider_error', 502],
    ['invalid_result', 502],
  ])('maps %s to HTTP %i with only the safe code', async (error, status) => {
    recognizePartMock.mockResolvedValue({ ok: false, error })
    const response = await handlePartRecognitionRequest(post(formWith(imageFile(JPEG_BYTES, 'image/jpeg'))))
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ ok: false, error })
  })
})

describe('POST /api/part-recognition — context', () => {
  it('passes locale and vehicle context, never the VIN or contact details', async () => {
    const form = formWith(imageFile(JPEG_BYTES, 'image/jpeg'), {
      locale: 'en',
      year: '2020',
      make: 'Toyota',
      model: 'RAV4',
      engine: '2.5L',
      vin: 'JTMBFREV0LD000000',
      email: 'awa@example.com',
      phone: '+221 77 123 45 67',
    })
    await handlePartRecognitionRequest(post(form))

    const call = recognizePartMock.mock.calls[0][0]
    expect(call.locale).toBe('en')
    expect(call.vehicle).toEqual({ year: 2020, make: 'Toyota', model: 'RAV4', engine: '2.5L' })
    expect(JSON.stringify(call.vehicle)).not.toContain('JTMBFREV0LD000000')
  })

  it('falls back to French for an unknown locale', async () => {
    await handlePartRecognitionRequest(post(formWith(imageFile(JPEG_BYTES, 'image/jpeg'), { locale: 'de' })))
    expect(recognizePartMock.mock.calls[0][0].locale).toBe('fr')
  })

  it('treats an absent vehicle as no context and ignores an out-of-range year', () => {
    expect(parseVehicleContext(new FormData())).toBeNull()
    const form = new FormData()
    form.append('year', '12345')
    form.append('make', 'Toyota')
    expect(parseVehicleContext(form)).toEqual({ year: null, make: 'Toyota', model: '', engine: null })
  })
})

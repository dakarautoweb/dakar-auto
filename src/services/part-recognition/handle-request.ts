import 'server-only'
import { defaultLocale, isLocale, type Locale } from '@/src/i18n/config'
import { MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import type { PartRecognitionErrorCode, PartRecognitionResponse, RecognitionVehicleContext } from '@/src/lib/part-recognition/types'
import { getPartRecognitionConfig } from './config'
import { recognizePart } from './recognize-part'
import { validateRecognitionImage } from './validate-image'

const MAX_CONTEXT_FIELD_LENGTH = 60
// Room for the multipart boundaries and the few small text fields.
const MAX_BODY_BYTES = MAX_FILE_SIZE_BYTES + 64 * 1024

export const ERROR_HTTP_STATUS: Record<PartRecognitionErrorCode, number> = {
  not_configured: 503,
  invalid_request: 400,
  missing_image: 400,
  empty_image: 400,
  unsupported_type: 415,
  too_large: 413,
  timeout: 504,
  rate_limited: 429,
  provider_error: 502,
  invalid_result: 502,
}

function textField(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_CONTEXT_FIELD_LENGTH) : ''
}

// Only year/make/model/engine are read — any other field the browser might
// send (a VIN, contact details) is ignored and never reaches OpenAI.
export function parseVehicleContext(form: FormData): RecognitionVehicleContext | null {
  const make = textField(form, 'make')
  const model = textField(form, 'model')
  const engine = textField(form, 'engine') || null
  const yearNumber = Number(textField(form, 'year'))
  const year = Number.isInteger(yearNumber) && yearNumber >= 1900 && yearNumber <= 2100 ? yearNumber : null
  if (!make && !model && !year && !engine) return null
  return { year, make, model, engine }
}

function parseLocale(form: FormData): Locale {
  const value = textField(form, 'locale')
  return isLocale(value) ? value : defaultLocale
}

function reply(body: PartRecognitionResponse): Response {
  return Response.json(body, { status: body.ok ? 200 : ERROR_HTTP_STATUS[body.error] })
}

export async function handlePartRecognitionRequest(request: Request): Promise<Response> {
  // Checked before touching the body, so an unconfigured deployment never
  // buffers an upload it can't use.
  if (!getPartRecognitionConfig()) {
    console.error('[part-recognition] Not configured: OPENAI_API_KEY is missing')
    return reply({ ok: false, error: 'not_configured' })
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return reply({ ok: false, error: 'too_large' })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return reply({ ok: false, error: 'invalid_request' })
  }

  const validation = await validateRecognitionImage(form.get('image'))
  if (!validation.ok) return reply({ ok: false, error: validation.error })

  const outcome = await recognizePart({
    image: validation.image,
    locale: parseLocale(form),
    vehicle: parseVehicleContext(form),
    signal: request.signal,
  })
  return reply(outcome.ok ? { ok: true, result: outcome.result } : { ok: false, error: outcome.error })
}

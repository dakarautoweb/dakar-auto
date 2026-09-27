import 'server-only'
import OpenAI from 'openai'
import type { Locale } from '@/src/i18n/config'
import { PART_SUBCATEGORY_KEYS } from '@/src/lib/parts-catalog'
import type { PartRecognitionErrorCode, PartRecognitionResult, RecognitionVehicleContext } from '@/src/lib/part-recognition/types'
import { getPartRecognitionConfig, PART_RECOGNITION_TIMEOUT_MS } from './config'
import { PART_RECOGNITION_JSON_SCHEMA, PART_RECOGNITION_SCHEMA_NAME } from './schema'
import { validateRecognitionResult } from './validate-result'
import type { RecognitionImage } from './validate-image'

export type RecognizePartInput = {
  image: RecognitionImage
  locale: Locale
  vehicle: RecognitionVehicleContext | null
  // The incoming request's signal — a customer closing the modal cancels
  // the provider call too.
  signal?: AbortSignal
}

export type RecognizePartOutcome = { ok: true; result: PartRecognitionResult } | { ok: false; error: PartRecognitionErrorCode }

const LANGUAGE_NAMES: Record<Locale, string> = { fr: 'French', en: 'English' }

const CATALOG_LINES = Object.entries(PART_SUBCATEGORY_KEYS)
  .map(([category, subcategories]) => `- ${category}: ${subcategories.join(', ')}`)
  .join('\n')

export function buildInstructions(locale: Locale): string {
  return `You are an automotive-part visual classifier for Dakar Auto.

Identify the automotive part visible in the image and classify it into the Dakar Auto catalog.

Single vs. multiple parts:
- One distinct part visible: status "identified", candidates [].
- Several copies of the SAME part are still one part (for example two brake rotors, or four spark plugs): status "identified", candidates [].
- If the image clearly contains several DISTINCT automotive parts that a customer could reasonably request separately (for example brake rotors + brake pads, or a headlight + a fog light that are visually distinct), do NOT pick one arbitrarily: status "multiple_parts", needsConfirmation true, and 2 to 3 candidates, one per distinct part, most prominent first. Fill the top-level partName/category/subcategory/confidence with the most prominent candidate.
- Each candidate follows the same category/subcategory rules as the main result and has its own confidence; candidates' confidences do not need to sum to 1.
- Never list the same category/subcategory twice, and never more than 3 candidates.
- status "uncertain": candidates may list up to 3 plausible choices, or [].
- status "not_a_part": candidates [].

Rules:
- Analyze what is actually visible. Vehicle context, when given, is supporting context only: never assume the part from the vehicle.
- Never invent an OEM number, part number or exact compatibility. Never claim a make/model-specific fit unless it is visually justified.
- category must be one of the catalog keys below, or "other". subcategory must be one of the keys listed for that same category, or null. Never invent a key.
- If the image is blurry, partial, or ambiguous about what the part is: status "uncertain" and needsConfirmation true.
- If the image does not show an automotive part: status "not_a_part", category "other", subcategory null, partName null.
- If it is an automotive part that does not cleanly match the catalog: category "other", subcategory null, needsConfirmation true.
- If you are confident of the category but not the exact subcategory: subcategory null and needsConfirmation true.
- confidence is your own estimate between 0 and 1. Do not force a confident answer when the evidence is insufficient.
- Keys stay in English exactly as listed. Write partName (including each candidate's) and explanation in ${LANGUAGE_NAMES[locale]}.
- partName: a short, specific part name (for example a side or position only if visible). explanation: 1–2 short sentences on the visual evidence.

Catalog (category: subcategories):
${CATALOG_LINES}`
}

export function describeVehicleContext(vehicle: RecognitionVehicleContext | null): string {
  if (!vehicle) return 'No vehicle context was provided.'
  const parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
  const engine = vehicle.engine ? `, engine: ${vehicle.engine}` : ''
  return parts || engine ? `Vehicle context (supporting only): ${parts}${engine}.` : 'No vehicle context was provided.'
}

// Error class names and HTTP status only — never the provider's message
// body, request payload, headers or key.
function logFailure(reason: string, error?: unknown) {
  const detail =
    error instanceof OpenAI.APIError
      ? ` (${error.constructor.name}${error.status ? ` ${error.status}` : ''})`
      : error instanceof Error
        ? ` (${error.name})`
        : ''
  console.error(`[part-recognition] ${reason}${detail}`)
}

export async function recognizePart({ image, locale, vehicle, signal }: RecognizePartInput): Promise<RecognizePartOutcome> {
  const config = getPartRecognitionConfig()
  if (!config) {
    console.error('[part-recognition] Not configured: OPENAI_API_KEY is missing')
    return { ok: false, error: 'not_configured' }
  }

  const client = new OpenAI({ apiKey: config.apiKey, timeout: PART_RECOGNITION_TIMEOUT_MS, maxRetries: 0 })
  const dataUrl = `data:${image.mime};base64,${image.buffer.toString('base64')}`

  let response: OpenAI.Responses.Response
  try {
    response = await client.responses.create(
      {
        model: config.model,
        instructions: buildInstructions(locale),
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: describeVehicleContext(vehicle) },
              { type: 'input_image', image_url: dataUrl, detail: 'auto' },
            ],
          },
        ],
        text: {
          format: { type: 'json_schema', name: PART_RECOGNITION_SCHEMA_NAME, schema: PART_RECOGNITION_JSON_SCHEMA, strict: true },
        },
        store: false,
      },
      { signal },
    )
  } catch (error) {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      logFailure('OpenAI request timed out', error)
      return { ok: false, error: 'timeout' }
    }
    if (error instanceof OpenAI.RateLimitError) {
      logFailure('OpenAI rate limit reached', error)
      return { ok: false, error: 'rate_limited' }
    }
    logFailure('OpenAI request failed', error)
    return { ok: false, error: 'provider_error' }
  }

  if (response.status !== 'completed') {
    logFailure(`OpenAI response not completed: ${response.status ?? 'unknown'}`)
    return { ok: false, error: 'invalid_result' }
  }
  const refused = response.output.some((item) => item.type === 'message' && item.content.some((c) => c.type === 'refusal'))
  if (refused) {
    logFailure('OpenAI refused the request')
    return { ok: false, error: 'invalid_result' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(response.output_text)
  } catch {
    logFailure('OpenAI returned unparseable output')
    return { ok: false, error: 'invalid_result' }
  }

  const result = validateRecognitionResult(parsed)
  if (!result) {
    logFailure('OpenAI returned a result outside the catalog/schema')
    return { ok: false, error: 'invalid_result' }
  }
  return { ok: true, result }
}

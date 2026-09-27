import type { PartCategoryKey } from '@/src/lib/parts-catalog'

// Shared by the server recognition service (src/services/part-recognition/),
// the /api/part-recognition route and the browser modal
// (identify-photo-modal.tsx). Pure types only — safe to import anywhere.

// multiple_parts: several distinct, separately requestable parts are
// visible (e.g. rotors + pads) — the customer picks one of `candidates`.
// Several copies of the same part are still `identified`.
export type PartRecognitionStatus = 'identified' | 'multiple_parts' | 'uncertain' | 'not_a_part'

// A canonical catalog key from PART_CATEGORY_KEYS, or OTHER_KEY when the
// part doesn't cleanly match the Dakar Auto catalog.
export type RecognitionCategory = PartCategoryKey | 'other'

// One distinct part among several. Validated exactly like the main result
// (see validate-result.ts): a subcategory that doesn't belong to the
// category is dropped, leaving a category-only candidate the customer
// confirms on the subcategory step.
export type PartRecognitionCandidate = {
  // Localized (site locale).
  partName: string
  category: RecognitionCategory
  subcategory: string | null
  // 0-1, per candidate — the model's own estimate, not a calibrated
  // probability; confidences across candidates don't sum to 1.
  confidence: number
}

export type PartRecognitionResult = {
  status: PartRecognitionStatus
  // Localized (site locale) — shown to the customer and used to prefill
  // Part Details. Null when no part could be named.
  partName: string | null
  category: RecognitionCategory
  // A key from PART_SUBCATEGORY_KEYS[category], or null. Always re-checked
  // server-side (see validate-result.ts), never trusted from the model.
  subcategory: string | null
  // 0-1 — the model's own estimate, not a calibrated probability.
  confidence: number
  needsConfirmation: boolean
  // Localized, 1–2 short sentences.
  explanation: string
  // multiple_parts: 2–3 distinct candidates, deduplicated by category/
  // subcategory. uncertain: up to 3 plausible choices. identified and
  // not_a_part: always [] (the main fields above are the answer).
  candidates: PartRecognitionCandidate[]
}

// The only vehicle details ever sent for recognition. Deliberately excludes
// the VIN and anything about the customer.
export type RecognitionVehicleContext = {
  year: number | null
  make: string
  model: string
  engine: string | null
}

export type PartRecognitionErrorCode =
  | 'not_configured'
  | 'invalid_request'
  | 'missing_image'
  | 'empty_image'
  | 'unsupported_type'
  | 'too_large'
  | 'timeout'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_result'

// JSON body returned by POST /api/part-recognition.
export type PartRecognitionResponse = { ok: true; result: PartRecognitionResult } | { ok: false; error: PartRecognitionErrorCode }

import 'server-only'
import { ALL_SUBCATEGORY_KEYS, RECOGNITION_CATEGORY_KEYS } from '@/src/lib/part-recognition/catalog'

// Structured Outputs schema (strict mode): every property required,
// no additional properties, and the category/subcategory enums built from
// parts-catalog.ts so the model can't return a key the catalog doesn't
// have. Strict JSON schema can't express "subcategory must belong to the
// chosen category", so that pairing is re-checked in validate-result.ts.
export const PART_RECOGNITION_SCHEMA_NAME = 'dakar_part_recognition'

export const MAX_RECOGNITION_CANDIDATES = 3

const CATEGORY_PROPERTY = { type: 'string', enum: [...RECOGNITION_CATEGORY_KEYS] } as const

const SUBCATEGORY_PROPERTY = {
  type: ['string', 'null'],
  enum: [...ALL_SUBCATEGORY_KEYS, null],
  description: 'Must be one of the subcategories listed for the chosen category, or null.',
} as const

const CONFIDENCE_PROPERTY = { type: 'number', description: 'Your own estimate between 0 and 1.' } as const

export const PART_RECOGNITION_CANDIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['partName', 'category', 'subcategory', 'confidence'],
  properties: {
    partName: { type: 'string', description: 'Short name of this distinct part, in the requested language.' },
    category: CATEGORY_PROPERTY,
    subcategory: SUBCATEGORY_PROPERTY,
    confidence: CONFIDENCE_PROPERTY,
  },
} as const

export const PART_RECOGNITION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'partName', 'category', 'subcategory', 'confidence', 'needsConfirmation', 'explanation', 'candidates'],
  properties: {
    status: { type: 'string', enum: ['identified', 'multiple_parts', 'uncertain', 'not_a_part'] },
    partName: { type: ['string', 'null'], description: 'Short name of the visible part, in the requested language.' },
    category: CATEGORY_PROPERTY,
    subcategory: SUBCATEGORY_PROPERTY,
    confidence: CONFIDENCE_PROPERTY,
    needsConfirmation: { type: 'boolean' },
    explanation: { type: 'string', description: '1–2 short sentences, in the requested language.' },
    candidates: {
      type: 'array',
      maxItems: MAX_RECOGNITION_CANDIDATES,
      description: 'multiple_parts: 2–3 distinct parts. uncertain: up to 3 plausible choices, or []. identified and not_a_part: [].',
      items: PART_RECOGNITION_CANDIDATE_SCHEMA,
    },
  },
} as const

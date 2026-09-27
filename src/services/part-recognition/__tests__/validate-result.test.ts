import { describe, expect, it } from 'vitest'
import { PART_CATEGORY_KEYS, PART_SUBCATEGORY_KEYS } from '@/src/lib/parts-catalog'
import { ALL_SUBCATEGORY_KEYS, RECOGNITION_CATEGORY_KEYS } from '@/src/lib/part-recognition/catalog'
import { PART_RECOGNITION_JSON_SCHEMA } from '../schema'
import { validateRecognitionResult } from '../validate-result'
import { multiplePartsOutput, PAD_CANDIDATE, ROTOR_CANDIDATE, validModelOutput } from './fixtures'

describe('validateRecognitionResult', () => {
  it('accepts a valid category + subcategory as-is', () => {
    expect(validateRecognitionResult(validModelOutput())).toEqual(validModelOutput())
  })

  it('accepts a valid category with a null subcategory', () => {
    const result = validateRecognitionResult(validModelOutput({ subcategory: null, needsConfirmation: true }))
    expect(result).toMatchObject({ category: 'braking', subcategory: null, needsConfirmation: true })
  })

  it('keeps the category but drops a subcategory from another category and requires confirmation', () => {
    const result = validateRecognitionResult(validModelOutput({ subcategory: 'headlights' }))
    expect(result).toMatchObject({ category: 'braking', subcategory: null, needsConfirmation: true })
  })

  it('drops a subcategory that exists nowhere in the catalog', () => {
    const result = validateRecognitionResult(validModelOutput({ subcategory: 'brakes' }))
    expect(result).toMatchObject({ subcategory: null, needsConfirmation: true })
  })

  it.each(['brakes', 'mechanical', 'car-parts', 'wheel', '', 'BRAKING'])('rejects the unknown category %j', (category) => {
    expect(validateRecognitionResult(validModelOutput({ category }))).toBeNull()
  })

  it.each([-0.01, 1.01, 92, Number.NaN, '0.9', null])('rejects confidence %j', (confidence) => {
    expect(validateRecognitionResult(validModelOutput({ confidence }))).toBeNull()
  })

  it('accepts the confidence bounds 0 and 1', () => {
    expect(validateRecognitionResult(validModelOutput({ confidence: 0 }))).not.toBeNull()
    expect(validateRecognitionResult(validModelOutput({ confidence: 1 }))).not.toBeNull()
  })

  it.each([null, 'text', [], { ...validModelOutput(), status: 'maybe' }, { ...validModelOutput(), needsConfirmation: 'no' }])(
    'rejects a malformed result %#',
    (raw) => {
      expect(validateRecognitionResult(raw)).toBeNull()
    },
  )

  it('forces confirmation for an uncertain result', () => {
    expect(validateRecognitionResult(validModelOutput({ status: 'uncertain' }))?.needsConfirmation).toBe(true)
  })

  it('never keeps a category or part name for not_a_part', () => {
    const result = validateRecognitionResult(validModelOutput({ status: 'not_a_part' }))
    expect(result).toMatchObject({ status: 'not_a_part', category: 'other', subcategory: null, partName: null, needsConfirmation: true })
  })

  it('an "other" category never carries a subcategory and always needs confirmation', () => {
    const result = validateRecognitionResult(validModelOutput({ category: 'other', subcategory: 'brake-calipers', needsConfirmation: false }))
    expect(result).toMatchObject({ category: 'other', subcategory: null, needsConfirmation: true })
  })

  it('trims and caps the free-text fields', () => {
    const result = validateRecognitionResult(validModelOutput({ partName: '  Étrier  ', explanation: 'x'.repeat(1000) }))
    expect(result?.partName).toBe('Étrier')
    expect(result?.explanation).toHaveLength(400)
  })
})

describe('recognition catalog constraints', () => {
  it('category keys are exactly PART_CATEGORY_KEYS plus "other"', () => {
    expect([...RECOGNITION_CATEGORY_KEYS]).toEqual([...PART_CATEGORY_KEYS, 'other'])
  })

  it('the schema enums come from the catalog', () => {
    expect(PART_RECOGNITION_JSON_SCHEMA.properties.category.enum).toEqual([...PART_CATEGORY_KEYS, 'other'])
    const subEnum = PART_RECOGNITION_JSON_SCHEMA.properties.subcategory.enum
    expect(subEnum).toContain(null)
    expect(new Set(subEnum.filter((k) => k !== null))).toEqual(new Set(Object.values(PART_SUBCATEGORY_KEYS).flat()))
    expect(subEnum.filter((k) => k !== null)).toEqual(ALL_SUBCATEGORY_KEYS)
  })

  it('the schema is strict-mode compatible: every property required, no additional properties', () => {
    expect(PART_RECOGNITION_JSON_SCHEMA.additionalProperties).toBe(false)
    expect([...PART_RECOGNITION_JSON_SCHEMA.required].sort()).toEqual(Object.keys(PART_RECOGNITION_JSON_SCHEMA.properties).sort())
    expect(PART_RECOGNITION_JSON_SCHEMA.properties.status.enum).toEqual(['identified', 'multiple_parts', 'uncertain', 'not_a_part'])
  })

  it('every catalog subcategory is accepted under its own category', () => {
    for (const category of PART_CATEGORY_KEYS) {
      for (const subcategory of PART_SUBCATEGORY_KEYS[category]) {
        expect(validateRecognitionResult(validModelOutput({ category, subcategory }))?.subcategory).toBe(subcategory)
      }
    }
  })
})

describe('validateRecognitionResult — multiple parts', () => {
  it('one visible part → identified, with no candidates', () => {
    const result = validateRecognitionResult(validModelOutput())
    expect(result).toMatchObject({ status: 'identified', subcategory: 'brake-calipers', candidates: [] })
  })

  it('brake rotors + brake pads → multiple_parts with 2 valid candidates, confirmation required', () => {
    const result = validateRecognitionResult(multiplePartsOutput())
    expect(result?.status).toBe('multiple_parts')
    expect(result?.needsConfirmation).toBe(true)
    expect(result?.candidates).toEqual([ROTOR_CANDIDATE, PAD_CANDIDATE])
  })

  it('candidate confidences are kept as-is — they are not forced to sum to 1', () => {
    const result = validateRecognitionResult(multiplePartsOutput())
    expect(result?.candidates.map((c) => c.confidence)).toEqual([0.96, 0.94])
  })

  it('never keeps more than 3 candidates (most confident first)', () => {
    const candidates = [
      { ...PAD_CANDIDATE, confidence: 0.5 },
      ROTOR_CANDIDATE,
      { partName: 'Étrier', category: 'braking', subcategory: 'brake-calipers', confidence: 0.7 },
      { partName: 'Flexible', category: 'braking', subcategory: 'brake-hoses', confidence: 0.9 },
    ]
    const result = validateRecognitionResult(multiplePartsOutput({ candidates }))
    expect(result?.candidates.map((c) => c.subcategory)).toEqual(['brake-rotors', 'brake-hoses', 'brake-calipers'])
  })

  it('the schema caps candidates at 3', () => {
    expect(PART_RECOGNITION_JSON_SCHEMA.properties.candidates.maxItems).toBe(3)
  })

  it('deduplicates candidates with the same category/subcategory, keeping the most confident', () => {
    const candidates = [{ ...ROTOR_CANDIDATE, partName: 'Disque avant', confidence: 0.8 }, PAD_CANDIDATE, ROTOR_CANDIDATE]
    const result = validateRecognitionResult(multiplePartsOutput({ candidates }))
    expect(result?.candidates).toEqual([ROTOR_CANDIDATE, PAD_CANDIDATE])
  })

  it('the same part several times (duplicates only) → identified as that part, not multiple_parts', () => {
    const candidates = [ROTOR_CANDIDATE, { ...ROTOR_CANDIDATE, partName: 'Disque de frein arrière', confidence: 0.9 }]
    const result = validateRecognitionResult(multiplePartsOutput({ candidates, partName: 'Disques', subcategory: 'brake-pads' }))
    expect(result).toMatchObject({
      status: 'identified',
      partName: 'Disque de frein',
      category: 'braking',
      subcategory: 'brake-rotors',
      confidence: 0.96,
      needsConfirmation: false,
      candidates: [],
    })
  })

  it('multiple_parts without any candidate falls back to uncertain', () => {
    const result = validateRecognitionResult(multiplePartsOutput({ candidates: [] }))
    expect(result).toMatchObject({ status: 'uncertain', needsConfirmation: true, candidates: [] })
  })

  it('a candidate with a subcategory from another category keeps its category only', () => {
    const candidates = [ROTOR_CANDIDATE, { partName: 'Phare', category: 'braking', subcategory: 'headlights', confidence: 0.8 }]
    const result = validateRecognitionResult(multiplePartsOutput({ candidates }))
    expect(result?.status).toBe('multiple_parts')
    expect(result?.candidates[1]).toEqual({ partName: 'Phare', category: 'braking', subcategory: null, confidence: 0.8 })
  })

  it('an "other" candidate never carries a subcategory', () => {
    const candidates = [ROTOR_CANDIDATE, { partName: 'Autocollant', category: 'other', subcategory: 'brake-pads', confidence: 0.6 }]
    expect(validateRecognitionResult(multiplePartsOutput({ candidates }))?.candidates[1].subcategory).toBeNull()
  })

  it.each([
    ['unknown category', { ...PAD_CANDIDATE, category: 'brakes' }],
    ['confidence above 1', { ...PAD_CANDIDATE, confidence: 94 }],
    ['negative confidence', { ...PAD_CANDIDATE, confidence: -0.1 }],
    ['missing part name', { ...PAD_CANDIDATE, partName: null }],
    ['non-string subcategory', { ...PAD_CANDIDATE, subcategory: 3 }],
    ['not an object', 'brake-pads'],
  ])('rejects the whole result for an invalid candidate (%s)', (_label, bad) => {
    expect(validateRecognitionResult(multiplePartsOutput({ candidates: [ROTOR_CANDIDATE, bad] }))).toBeNull()
  })

  it('rejects a result without a candidates array', () => {
    expect(validateRecognitionResult(validModelOutput({ candidates: null }))).toBeNull()
    const withoutCandidates: Record<string, unknown> = validModelOutput()
    delete withoutCandidates.candidates
    expect(validateRecognitionResult(withoutCandidates)).toBeNull()
  })

  it('not_a_part → candidates []', () => {
    const result = validateRecognitionResult(multiplePartsOutput({ status: 'not_a_part' }))
    expect(result).toMatchObject({ status: 'not_a_part', category: 'other', candidates: [] })
  })

  it('identified never carries candidates', () => {
    expect(validateRecognitionResult(validModelOutput({ candidates: [ROTOR_CANDIDATE] }))?.candidates).toEqual([])
  })

  it('uncertain may keep up to 3 plausible candidates', () => {
    const result = validateRecognitionResult(multiplePartsOutput({ status: 'uncertain' }))
    expect(result).toMatchObject({ status: 'uncertain', needsConfirmation: true })
    expect(result?.candidates).toHaveLength(2)
  })

  it('the candidate schema is strict-mode compatible', () => {
    const items = PART_RECOGNITION_JSON_SCHEMA.properties.candidates.items
    expect(items.additionalProperties).toBe(false)
    expect([...items.required].sort()).toEqual(Object.keys(items.properties).sort())
    expect(items.properties.category.enum).toEqual([...PART_CATEGORY_KEYS, 'other'])
  })
})

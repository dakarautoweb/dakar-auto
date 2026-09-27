import { describe, expect, it } from 'vitest'
import fr from '@/src/i18n/dictionaries/fr.json'
import en from '@/src/i18n/dictionaries/en.json'
import { PART_CATEGORY_KEYS, PART_SUBCATEGORY_KEYS } from '@/src/lib/parts-catalog'
import type { ConfirmedVehicle } from '@/src/components/vehicle-wizard/types'
import type { PartRecognitionCandidate, PartRecognitionResult } from '../types'
import { candidateAsResult, planRecognitionApplication, resolveCategoryLabel, resolveSubcategoryLabel, toRecognitionVehicleContext } from '../wizard-mapping'

const labels = fr.categories.items

function result(overrides: Partial<PartRecognitionResult> = {}): PartRecognitionResult {
  return {
    status: 'identified',
    partName: 'Étrier de frein avant',
    category: 'braking',
    subcategory: 'brake-calipers',
    confidence: 0.92,
    needsConfirmation: false,
    explanation: 'Étrier visible.',
    candidates: [],
    ...overrides,
  }
}

describe('planRecognitionApplication', () => {
  it('category + subcategory → straight to Part Details with the AI part name', () => {
    expect(planRecognitionApplication(result(), labels)).toEqual({
      kind: 'details',
      category: 'braking',
      subcategory: { key: 'brake-calipers', label: 'Étriers de frein' },
      partName: 'Étrier de frein avant',
    })
  })

  it('falls back to the localized subcategory label when the AI gave no part name', () => {
    const plan = planRecognitionApplication(result({ partName: null }), en.categories.items)
    expect(plan).toMatchObject({ kind: 'details', partName: 'Brake Calipers' })
  })

  it('category only → SubcategoryStep', () => {
    expect(planRecognitionApplication(result({ subcategory: null, needsConfirmation: true }), labels)).toEqual({
      kind: 'subcategory',
      category: 'braking',
    })
  })

  it('a subcategory that still needs confirmation → SubcategoryStep', () => {
    expect(planRecognitionApplication(result({ needsConfirmation: true }), labels)).toEqual({ kind: 'subcategory', category: 'braking' })
  })

  it('a subcategory from another category is never applied', () => {
    expect(planRecognitionApplication(result({ subcategory: 'headlights' }), labels)).toEqual({ kind: 'subcategory', category: 'braking' })
  })

  it.each([
    ['uncertain', result({ status: 'uncertain', needsConfirmation: true })],
    ['not_a_part', result({ status: 'not_a_part', category: 'other', subcategory: null, partName: null })],
    ['other', result({ category: 'other', subcategory: null, needsConfirmation: true })],
  ])('%s → nothing is applied (manual selection)', (_label, value) => {
    expect(planRecognitionApplication(value, labels)).toEqual({ kind: 'manual' })
  })
})

describe('catalog labels', () => {
  it('resolves canonical keys to localized labels, never raw keys', () => {
    expect(resolveCategoryLabel(labels, 'braking')).toBe('Freinage')
    expect(resolveSubcategoryLabel(labels, 'braking', 'brake-calipers')).toBe('Étriers de frein')
    expect(resolveSubcategoryLabel(labels, 'braking', 'headlights')).toBeNull()
  })

  it('every catalog key has a label in both dictionaries', () => {
    for (const dict of [fr, en]) {
      for (const category of PART_CATEGORY_KEYS) {
        expect(resolveCategoryLabel(dict.categories.items, category)).toBeTruthy()
        for (const sub of PART_SUBCATEGORY_KEYS[category]) {
          expect(resolveSubcategoryLabel(dict.categories.items, category, sub)).toBeTruthy()
        }
      }
    }
  })
})

describe('toRecognitionVehicleContext', () => {
  it('keeps only year/make/model/engine — never the VIN', () => {
    const vehicle: ConfirmedVehicle = {
      source: 'vin',
      identificationSource: 'auto_dev',
      vin: 'JTMBFREV0LD000000',
      year: 2020,
      make: 'Toyota',
      model: 'RAV4',
      trim: 'XLE',
      engine: '2.5L',
      transmission: null,
      bodyStyle: null,
      fuelType: null,
      drivetrain: null,
      imageUrl: null,
    }
    const context = toRecognitionVehicleContext(vehicle)
    expect(context).toEqual({ year: 2020, make: 'Toyota', model: 'RAV4', engine: '2.5L' })
    expect(JSON.stringify(context)).not.toContain('JTMBFREV0LD000000')
    expect(toRecognitionVehicleContext(null)).toBeNull()
  })
})

describe('multiple_parts candidate selection', () => {
  const rotor: PartRecognitionCandidate = { partName: 'Disque de frein', category: 'braking', subcategory: 'brake-rotors', confidence: 0.96 }
  const pad: PartRecognitionCandidate = { partName: 'Plaquette de frein', category: 'braking', subcategory: 'brake-pads', confidence: 0.94 }
  const multiple = result({ status: 'multiple_parts', needsConfirmation: true, candidates: [rotor, pad] })

  it('a multiple_parts result is never applied on its own', () => {
    expect(planRecognitionApplication(multiple, labels)).toEqual({ kind: 'manual' })
  })

  it('category + subcategory candidate → Part Details with its own part name', () => {
    expect(planRecognitionApplication(candidateAsResult(pad, multiple), labels)).toEqual({
      kind: 'details',
      category: 'braking',
      subcategory: { key: 'brake-pads', label: 'Plaquettes de frein' },
      partName: 'Plaquette de frein',
    })
    expect(planRecognitionApplication(candidateAsResult(rotor, multiple), labels)).toMatchObject({
      kind: 'details',
      subcategory: { key: 'brake-rotors' },
      partName: 'Disque de frein',
    })
  })

  it('category-only candidate → SubcategoryStep', () => {
    const categoryOnly = { ...pad, subcategory: null }
    expect(planRecognitionApplication(candidateAsResult(categoryOnly, multiple), labels)).toEqual({ kind: 'subcategory', category: 'braking' })
  })

  it('"other" candidate → nothing applied (manual selection)', () => {
    const other: PartRecognitionCandidate = { partName: 'Autocollant', category: 'other', subcategory: null, confidence: 0.5 }
    expect(planRecognitionApplication(candidateAsResult(other, multiple), labels)).toEqual({ kind: 'manual' })
  })

  it('a candidate without a part name falls back to the localized subcategory label', () => {
    expect(planRecognitionApplication(candidateAsResult({ ...pad, partName: '' }, multiple), en.categories.items)).toMatchObject({
      kind: 'details',
      partName: 'Brake Pads',
    })
  })
})

import { OTHER_KEY, PART_CATEGORY_KEYS, PART_SUBCATEGORY_KEYS, type PartCategoryKey } from '@/src/lib/parts-catalog'
import type { RecognitionCategory } from './types'

// Everything here is derived from parts-catalog.ts — that file stays the
// single source of truth for which category/subcategory keys exist.

export const RECOGNITION_CATEGORY_KEYS: readonly RecognitionCategory[] = [...PART_CATEGORY_KEYS, OTHER_KEY as 'other']

// Every subcategory key across the catalog, deduplicated (some keys, e.g.
// 'transmission-filter', exist under more than one category). Used for the
// Structured Outputs enum; the per-category pairing is checked separately
// by isSubcategoryOf.
export const ALL_SUBCATEGORY_KEYS: readonly string[] = [...new Set(Object.values(PART_SUBCATEGORY_KEYS).flat())]

export function isPartCategoryKey(value: unknown): value is PartCategoryKey {
  return typeof value === 'string' && (PART_CATEGORY_KEYS as readonly string[]).includes(value)
}

export function isRecognitionCategory(value: unknown): value is RecognitionCategory {
  return typeof value === 'string' && RECOGNITION_CATEGORY_KEYS.includes(value as RecognitionCategory)
}

export function isSubcategoryOf(category: RecognitionCategory, subcategory: string): boolean {
  return isPartCategoryKey(category) && PART_SUBCATEGORY_KEYS[category].includes(subcategory)
}

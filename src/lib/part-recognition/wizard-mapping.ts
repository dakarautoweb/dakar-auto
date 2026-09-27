import type { ConfirmedVehicle } from '@/src/components/vehicle-wizard/types'
import { isPartCategoryKey, isSubcategoryOf } from './catalog'
import type { PartRecognitionCandidate, PartRecognitionResult, RecognitionVehicleContext } from './types'

// Pure helpers between a recognition result and the part-request wizard —
// kept out of the React components so the routing rules are unit-testable.

// The subset of dict.categories.items these helpers need.
export type CatalogLabels = ReadonlyArray<{
  key: string
  title: string
  subcategories: ReadonlyArray<{ key: string; title: string }>
}>

export type RecognitionPlan =
  // Valid category + subcategory: prefill Part Details and go straight there.
  | { kind: 'details'; category: string; subcategory: { key: string; label: string }; partName: string }
  // Valid category only (or a subcategory that still needs confirming):
  // select the category and let the customer pick the subcategory.
  | { kind: 'subcategory'; category: string }
  // Uncertain, not a part, multiple parts (the customer picks a candidate
  // first — see candidateAsResult), or outside the catalog: nothing is applied —
  // the customer chooses manually.
  | { kind: 'manual' }

export function planRecognitionApplication(result: PartRecognitionResult, labels: CatalogLabels): RecognitionPlan {
  if (result.status !== 'identified' || !isPartCategoryKey(result.category)) return { kind: 'manual' }

  const category = result.category
  const subcategory = result.subcategory
  if (result.needsConfirmation || !subcategory || !isSubcategoryOf(category, subcategory)) {
    return { kind: 'subcategory', category }
  }

  const subcategoryLabel = resolveSubcategoryLabel(labels, category, subcategory)
  // A subcategory the dictionary can't label would render as a raw key —
  // let the customer pick it from the normal grid instead.
  if (!subcategoryLabel) return { kind: 'subcategory', category }

  const partName = result.partName?.trim() || subcategoryLabel
  return { kind: 'details', category, subcategory: { key: subcategory, label: subcategoryLabel }, partName }
}

// A candidate the customer picked from a multiple_parts result, as a
// single-part result — so it goes through exactly the same routing as
// "Use this part": category + subcategory → Part Details; category only →
// SubcategoryStep; "other" → nothing applied (manual selection).
export function candidateAsResult(candidate: PartRecognitionCandidate, source: PartRecognitionResult): PartRecognitionResult {
  return {
    status: 'identified',
    partName: candidate.partName || null,
    category: candidate.category,
    subcategory: candidate.subcategory,
    confidence: candidate.confidence,
    needsConfirmation: candidate.category === 'other' || candidate.subcategory === null,
    explanation: source.explanation,
    candidates: [],
  }
}

export function resolveCategoryLabel(labels: CatalogLabels, category: string): string | null {
  return labels.find((c) => c.key === category)?.title ?? null
}

export function resolveSubcategoryLabel(labels: CatalogLabels, category: string, subcategory: string): string | null {
  return labels.find((c) => c.key === category)?.subcategories.find((s) => s.key === subcategory)?.title ?? null
}

// Only year/make/model/engine — never the VIN or any customer detail.
export function toRecognitionVehicleContext(vehicle: ConfirmedVehicle | null): RecognitionVehicleContext | null {
  if (!vehicle) return null
  return { year: vehicle.year, make: vehicle.make, model: vehicle.model, engine: vehicle.engine }
}

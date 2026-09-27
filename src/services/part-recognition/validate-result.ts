import 'server-only'
import { isRecognitionCategory, isSubcategoryOf } from '@/src/lib/part-recognition/catalog'
import type { PartRecognitionCandidate, PartRecognitionResult, PartRecognitionStatus, RecognitionCategory } from '@/src/lib/part-recognition/types'
import { MAX_RECOGNITION_CANDIDATES } from './schema'

const STATUSES: readonly PartRecognitionStatus[] = ['identified', 'multiple_parts', 'uncertain', 'not_a_part']
const MAX_PART_NAME_LENGTH = 120
const MAX_EXPLANATION_LENGTH = 400

function cleanText(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function isConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

// A subcategory is only kept when it belongs to the category — otherwise
// it's dropped and the category alone remains (customer confirms it).
function pairedSubcategory(category: RecognitionCategory, subcategory: string | null): string | null {
  return subcategory !== null && isSubcategoryOf(category, subcategory) ? subcategory : null
}

// Same rules as the main result. Returns null when the candidate's shape is
// wrong (unknown category, confidence outside 0..1, wrong types) — which
// rejects the whole result, exactly like an invalid main category does.
function validateCandidate(raw: unknown): PartRecognitionCandidate | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const c = raw as Record<string, unknown>
  if (typeof c.partName !== 'string') return null
  if (!isRecognitionCategory(c.category)) return null
  if (c.subcategory !== null && typeof c.subcategory !== 'string') return null
  if (!isConfidence(c.confidence)) return null
  return {
    partName: cleanText(c.partName, MAX_PART_NAME_LENGTH),
    category: c.category,
    subcategory: pairedSubcategory(c.category, c.subcategory as string | null),
    confidence: c.confidence,
  }
}

// One candidate per canonical category/subcategory pair (the most confident
// one wins), most confident first, never more than MAX_RECOGNITION_CANDIDATES.
function dedupeCandidates(candidates: PartRecognitionCandidate[]): PartRecognitionCandidate[] {
  const byPair = new Map<string, PartRecognitionCandidate>()
  for (const candidate of candidates) {
    const key = `${candidate.category}|${candidate.subcategory ?? ''}`
    const existing = byPair.get(key)
    if (!existing || candidate.confidence > existing.confidence) byPair.set(key, candidate)
  }
  return [...byPair.values()].sort((a, b) => b.confidence - a.confidence).slice(0, MAX_RECOGNITION_CANDIDATES)
}

// Second line of defence after Structured Outputs: the model's JSON is
// never used as-is. Returns null (→ `invalid_result`) when the shape itself
// is wrong — unknown status/category, confidence outside 0..1, wrong types,
// in the main result or in any candidate. A category/subcategory mismatch
// is not a hard failure: the valid category is kept, the subcategory
// dropped and confirmation required.
export function validateRecognitionResult(raw: unknown): PartRecognitionResult | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>

  if (typeof r.status !== 'string' || !STATUSES.includes(r.status as PartRecognitionStatus)) return null
  if (!isRecognitionCategory(r.category)) return null
  if (!isConfidence(r.confidence)) return null
  if (typeof r.needsConfirmation !== 'boolean') return null
  if (typeof r.explanation !== 'string') return null
  if (r.partName !== null && typeof r.partName !== 'string') return null
  if (r.subcategory !== null && typeof r.subcategory !== 'string') return null
  if (!Array.isArray(r.candidates)) return null

  const validCandidates: PartRecognitionCandidate[] = []
  for (const rawCandidate of r.candidates) {
    const candidate = validateCandidate(rawCandidate)
    if (!candidate) return null
    validCandidates.push(candidate)
  }

  let status = r.status as PartRecognitionStatus
  let category = r.category
  let subcategory = r.subcategory as string | null
  let confidence = r.confidence
  let needsConfirmation = r.needsConfirmation
  let partName = r.partName === null ? null : cleanText(r.partName as string, MAX_PART_NAME_LENGTH) || null
  let candidates = dedupeCandidates(validCandidates)

  if (status === 'multiple_parts') {
    if (candidates.length === 1) {
      // The "several parts" were copies of the same catalog part (e.g. two
      // rotors) — that's a plain identification of that one part.
      const [only] = candidates
      status = 'identified'
      partName = only.partName || null
      category = only.category
      subcategory = only.subcategory
      confidence = only.confidence
      needsConfirmation = only.subcategory === null
    } else if (candidates.length === 0) {
      status = 'uncertain'
    } else {
      // The customer has to pick one — nothing is applied on its own.
      needsConfirmation = true
    }
  }
  // Only multiple_parts and uncertain carry choices; for the others the
  // main fields are the whole answer.
  if (status === 'identified' || status === 'not_a_part') candidates = []

  if (subcategory !== null && !isSubcategoryOf(category, subcategory)) {
    subcategory = null
    needsConfirmation = true
  }

  if (status === 'not_a_part') {
    // Never surface a category for something that isn't a car part.
    category = 'other'
    subcategory = null
    partName = null
    needsConfirmation = true
  }
  if (status === 'uncertain' || category === 'other' || !partName) needsConfirmation = true

  return {
    status,
    partName,
    category,
    subcategory,
    confidence,
    needsConfirmation,
    explanation: cleanText(r.explanation, MAX_EXPLANATION_LENGTH),
    candidates,
  }
}

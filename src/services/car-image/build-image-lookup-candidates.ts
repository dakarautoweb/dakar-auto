// Pure, no side effects — safe to unit-test in isolation and reuse from
// any image provider's lookup logic.
//
// Auto.dev's decoded `model` sometimes carries a body-style abbreviation
// baked in (e.g. "Accord Cpe"), and separately decodes a `bodyStyle` field
// (e.g. "Coupe 2D"). An image provider's own catalog may key on a
// differently-worded model string ("Accord Coupe") or may not distinguish
// body style at all for a given model. This builds a small, ordered,
// de-duplicated chain of model strings worth trying, in preference order,
// without ever hardcoding a specific make/model.
import { normalizeModelForImageLookup } from './normalize-model'

export type CanonicalBodyStyle = 'Coupe' | 'Sedan' | 'Hatchback' | 'Wagon' | 'Convertible' | 'SUV' | 'Pickup' | 'Van'

// Only these explicit, well-known body-style types get a semantic model
// variant built for them — deliberately conservative per requirement:
// never guess a body style, never build a variant for anything not
// unambiguously one of these.
const BODY_STYLE_ALIASES: Record<string, CanonicalBodyStyle> = {
  coupe: 'Coupe',
  cpe: 'Coupe',
  sedan: 'Sedan',
  sdn: 'Sedan',
  hatchback: 'Hatchback',
  hatch: 'Hatchback',
  wagon: 'Wagon',
  convertible: 'Convertible',
  cabriolet: 'Convertible',
  suv: 'SUV',
  pickup: 'Pickup',
  truck: 'Pickup',
  van: 'Van',
  minivan: 'Van',
}

// Word-boundary match (not `.includes()`) — avoids e.g. "van" inside
// "Savannah" or "suv" inside some unrelated token.
function containsBodyStyleToken(text: string, alias: string): boolean {
  return new RegExp(`(?:^|[^a-z])${alias}(?:[^a-z]|$)`, 'i').test(text)
}

// Maps a free-text body-style string as Auto.dev decodes it (e.g. "Coupe
// 2D", "Sedan 4D", "Sport Utility") to one of the explicit canonical body
// styles above. Returns null for anything unrecognized or absent —
// deliberately conservative rather than guessing.
export function classifyBodyStyle(bodyStyle: string | null | undefined): CanonicalBodyStyle | null {
  if (!bodyStyle) return null
  for (const [alias, canonical] of Object.entries(BODY_STYLE_ALIASES)) {
    if (containsBodyStyleToken(bodyStyle, alias)) return canonical
  }
  return null
}

// Builds the ordered candidate chain:
//   1. the raw decoded model as-is (e.g. "Accord Cpe") — may already carry
//      body-style info Auto.dev baked in, and the provider's own fuzzy
//      matching might resolve it directly;
//   2. "<base model> <canonical body style>" (e.g. "Accord Coupe") — the
//      provider's own vocabulary for that body style, only built when
//      bodyStyle maps to one of the explicit known types above;
//   3. the bare base model (e.g. "Accord") — last resort, no body-style
//      guarantee.
// Reuses normalizeModelForImageLookup to strip a body-style suffix already
// present in the raw model, rather than re-implementing that stripping
// logic here. Duplicates are removed (case-insensitive), order preserved.
// Works for any model/bodyStyle pair — never references a specific
// make/model.
export function buildImageLookupCandidates(model: string, bodyStyle: string | null | undefined): string[] {
  const rawModel = model.trim()
  if (!rawModel) return []

  const baseModel = normalizeModelForImageLookup(rawModel) ?? rawModel
  const canonicalBodyStyle = classifyBodyStyle(bodyStyle)
  const semanticVariant = canonicalBodyStyle ? `${baseModel} ${canonicalBodyStyle}`.trim() : null

  const ordered = [rawModel, semanticVariant, baseModel].filter((c): c is string => Boolean(c))

  const seen = new Set<string>()
  return ordered.filter((candidate) => {
    const key = candidate.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

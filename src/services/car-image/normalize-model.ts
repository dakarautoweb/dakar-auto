// Pure, no imports — safe to unit-test in isolation.
//
// Auto.dev's decoded `model` is a *display* value and sometimes carries a
// body-style suffix baked in (e.g. "Accord Cpe", "Civic Sdn") that's useful
// to show the customer but doesn't match the image provider's base-model
// catalog entries (e.g. CarImages API has "Accord", not "Accord Cpe").
// This strips ONLY the specific, well-known body-style tokens below —
// never anything else, and never in a way that could turn one real model
// into a different one.

const BODY_STYLE_SUFFIXES = new Set([
  'cpe',
  'coupe',
  'sedan',
  'sdn',
  'hatchback',
  'hatch',
  'wagon',
  'suv',
  'convertible',
  'cabriolet',
  'van',
  'pickup',
  'truck',
])

// Returns the model with trailing body-style tokens removed, or null if
// there was nothing to strip (i.e. the raw model is already the base
// model) — callers use null to skip a redundant second lookup. Only ever
// strips from the end, one whole word at a time, and always keeps at least
// one word — this can shrink "Accord Cpe" to "Accord", but can't turn
// "Accord" into something else, and won't touch a model whose real name
// happens to end in one of these words if that's literally the whole
// model ("Wagon" alone stays "Wagon" — end > 1 guards that).
export function normalizeModelForImageLookup(rawModel: string): string | null {
  const words = rawModel.trim().split(/\s+/)
  let end = words.length

  while (end > 1) {
    const lastWord = words[end - 1].toLowerCase().replace(/[.,]/g, '')
    if (!BODY_STYLE_SUFFIXES.has(lastWord)) break
    end--
  }

  if (end === words.length) return null

  const normalized = words.slice(0, end).join(' ').trim()
  return normalized.length > 0 ? normalized : null
}

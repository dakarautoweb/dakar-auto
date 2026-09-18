// Valid VIN characters exclude I, O, and Q (easily confused with 1 and 0).
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

export type VinValidationError = 'length' | 'characters'

export function normalizeVin(raw: string): string {
  return raw.trim().toUpperCase()
}

export function validateVin(vin: string): VinValidationError | null {
  if (vin.length !== 17) return 'length'
  if (!VIN_PATTERN.test(vin)) return 'characters'
  return null
}

export function isValidVin(vin: string): boolean {
  return validateVin(vin) === null
}

// For logs only — never log a full VIN. Keeps the last 4 characters, which
// is enough to correlate a log line with a support conversation without
// reproducing an identifier tied to a real vehicle/owner.
export function maskVin(vin: string): string {
  if (vin.length <= 4) return '*'.repeat(vin.length)
  return '*'.repeat(vin.length - 4) + vin.slice(-4)
}

// ISO 3779 / NHTSA check-digit transliteration (position 9, weight 0 below
// — it's the digit being checked, not an input to the sum).
const VIN_CHECKSUM_TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
}
const VIN_CHECKSUM_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

export type VinChecksumStatus = 'valid' | 'invalid' | 'not-applicable'

// The check digit is mandatory for North American market VINs but many
// other markets don't compute it meaningfully — so this is an advisory
// signal only (e.g. to nudge OCR candidate scoring), never a hard
// validation rule. Callers must not reject an otherwise structurally valid
// VIN just because this returns 'invalid'.
export function vinChecksumStatus(vin: string): VinChecksumStatus {
  if (validateVin(vin) !== null) return 'not-applicable'

  let sum = 0
  for (let i = 0; i < 17; i++) {
    const ch = vin[i]
    const value = ch >= '0' && ch <= '9' ? Number(ch) : VIN_CHECKSUM_TRANSLITERATION[ch]
    if (value === undefined) return 'not-applicable'
    sum += value * VIN_CHECKSUM_WEIGHTS[i]
  }
  const remainder = sum % 11
  const expected = remainder === 10 ? 'X' : String(remainder)
  return vin[8] === expected ? 'valid' : 'invalid'
}

const VIN_CANDIDATE_PATTERN = /[A-HJ-NPR-Z0-9]{17}/

// Best-effort extraction of a VIN-shaped substring from raw OCR text.
// Deliberately conservative: uppercase, strip whitespace/hyphens/newlines,
// then look for 17 *consecutive* characters already in the valid VIN
// charset (I/O/Q excluded) — no character substitution or "fixing up" of
// what the OCR engine returned. If OCR output contains more than one such
// run (e.g. stray text before/after the plate), this returns the first —
// there's no check-digit validation here to pick a better one, and the
// caller always requires human confirmation before the value is used for
// anything, which is the real safeguard against a wrong guess.
export function extractVinCandidate(rawText: string): string | null {
  const cleaned = rawText.toUpperCase().replace(/[\s-]/g, '')
  const match = cleaned.match(VIN_CANDIDATE_PATTERN)
  return match ? match[0] : null
}

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

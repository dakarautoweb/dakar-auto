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

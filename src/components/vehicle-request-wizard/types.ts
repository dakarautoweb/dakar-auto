export type WizardStep = 'vehicle' | 'budget' | 'contact' | 'review'

// Numeric fields are kept as strings while editing (natural for text/number
// inputs and empty values) and parsed to number | null only at submit time.
export type VehicleWantedFormState = {
  make: string
  model: string
  yearFrom: string
  yearTo: string
  color: string
  engine: string
  transmission: string
  mileageMin: string
  mileageMax: string
  trimLevel: string
}

export type BudgetFormState = {
  budgetMin: string
  budgetMax: string
  currency: string
  otherPreferences: string
}

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseOptionalFloat(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

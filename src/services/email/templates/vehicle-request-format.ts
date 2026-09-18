import 'server-only'

// Deliberately structural, minimal param types (only the fields each
// function actually reads, and nullable where a real DB row can be null) —
// both VehicleRequestEmailData['vehicle'] (non-null strings, since the
// wizard always sends '') and VehicleTrackingInfo['vehicle'] (nullable,
// since the DB column can be null) satisfy these without a cast.

export function makeModelLine(vehicle: { make: string | null; model: string | null }): string {
  return [vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'
}

export function yearRangeLine(vehicle: { yearFrom: number | null; yearTo: number | null }): string | null {
  const { yearFrom, yearTo } = vehicle
  if (yearFrom && yearTo) return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`
  if (yearFrom) return `${yearFrom}+`
  if (yearTo) return `≤ ${yearTo}`
  return null
}

export function mileageRangeLine(vehicle: { mileageMin: number | null; mileageMax: number | null }): string | null {
  const { mileageMin, mileageMax } = vehicle
  if (mileageMin != null && mileageMax != null) return `${mileageMin}–${mileageMax} km`
  if (mileageMin != null) return `≥ ${mileageMin} km`
  if (mileageMax != null) return `≤ ${mileageMax} km`
  return null
}

export function budgetRangeLine(vehicle: { budgetMin: number | null; budgetMax: number | null; currency: string }): string | null {
  const { budgetMin, budgetMax, currency } = vehicle
  if (budgetMin != null && budgetMax != null) return `${budgetMin} – ${budgetMax} ${currency}`
  if (budgetMin != null) return `≥ ${budgetMin} ${currency}`
  if (budgetMax != null) return `≤ ${budgetMax} ${currency}`
  return null
}

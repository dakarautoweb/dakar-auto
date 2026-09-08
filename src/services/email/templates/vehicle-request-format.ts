import 'server-only'
import type { VehicleRequestEmailData } from '../vehicle-request-types'

export function makeModelLine(vehicle: VehicleRequestEmailData['vehicle']): string {
  return [vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'
}

export function yearRangeLine(vehicle: VehicleRequestEmailData['vehicle']): string | null {
  const { yearFrom, yearTo } = vehicle
  if (yearFrom && yearTo) return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`
  if (yearFrom) return `${yearFrom}+`
  if (yearTo) return `≤ ${yearTo}`
  return null
}

export function mileageRangeLine(vehicle: VehicleRequestEmailData['vehicle']): string | null {
  const { mileageMin, mileageMax } = vehicle
  if (mileageMin != null && mileageMax != null) return `${mileageMin}–${mileageMax} km`
  if (mileageMin != null) return `≥ ${mileageMin} km`
  if (mileageMax != null) return `≤ ${mileageMax} km`
  return null
}

export function budgetRangeLine(vehicle: VehicleRequestEmailData['vehicle']): string | null {
  const { budgetMin, budgetMax, currency } = vehicle
  if (budgetMin != null && budgetMax != null) return `${budgetMin} – ${budgetMax} ${currency}`
  if (budgetMin != null) return `≥ ${budgetMin} ${currency}`
  if (budgetMax != null) return `≤ ${budgetMax} ${currency}`
  return null
}

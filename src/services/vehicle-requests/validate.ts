import 'server-only'
import type { SubmitVehicleRequestInput } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_CONTACT_METHODS = ['whatsapp', 'phone', 'email']
const VALID_LOCALES = ['en', 'fr']
export const VALID_CURRENCIES = ['XOF', 'EUR', 'USD', 'CAD']

const MIN_YEAR = 1950
const MAX_YEAR = new Date().getFullYear() + 1

export function validateSubmitVehicleRequestInput(input: SubmitVehicleRequestInput): string | null {
  const { vehicle, contact, locale } = input

  if (!contact.name.trim()) return 'missing_name'
  if (!contact.phone.trim()) return 'missing_phone'
  if (contact.email && !EMAIL_PATTERN.test(contact.email)) return 'invalid_email'
  if (!VALID_CONTACT_METHODS.includes(contact.preferredContact)) return 'invalid_contact_method'
  if (!contact.whatsappSameAsPhone && contact.preferredContact === 'whatsapp' && !contact.whatsappPhone?.trim()) {
    return 'missing_whatsapp_phone'
  }

  if (vehicle.yearFrom !== null && (!Number.isInteger(vehicle.yearFrom) || vehicle.yearFrom < MIN_YEAR || vehicle.yearFrom > MAX_YEAR)) {
    return 'invalid_year_from'
  }
  if (vehicle.yearTo !== null && (!Number.isInteger(vehicle.yearTo) || vehicle.yearTo < MIN_YEAR || vehicle.yearTo > MAX_YEAR)) {
    return 'invalid_year_to'
  }
  if (vehicle.yearFrom !== null && vehicle.yearTo !== null && vehicle.yearFrom > vehicle.yearTo) {
    return 'invalid_year_range'
  }

  if (vehicle.mileageMin !== null && (!Number.isFinite(vehicle.mileageMin) || vehicle.mileageMin < 0)) return 'invalid_mileage_min'
  if (vehicle.mileageMax !== null && (!Number.isFinite(vehicle.mileageMax) || vehicle.mileageMax < 0)) return 'invalid_mileage_max'
  if (vehicle.mileageMin !== null && vehicle.mileageMax !== null && vehicle.mileageMin > vehicle.mileageMax) {
    return 'invalid_mileage_range'
  }

  if (vehicle.budgetMin !== null && (!Number.isFinite(vehicle.budgetMin) || vehicle.budgetMin < 0)) return 'invalid_budget_min'
  if (vehicle.budgetMax !== null && (!Number.isFinite(vehicle.budgetMax) || vehicle.budgetMax < 0)) return 'invalid_budget_max'
  if (vehicle.budgetMin !== null && vehicle.budgetMax !== null && vehicle.budgetMin > vehicle.budgetMax) {
    return 'invalid_budget_range'
  }

  if (vehicle.currency && !VALID_CURRENCIES.includes(vehicle.currency)) return 'invalid_currency'

  if (vehicle.make.length > 100) return 'make_too_long'
  if (vehicle.model.length > 100) return 'model_too_long'
  if (vehicle.color.length > 100) return 'color_too_long'
  if (vehicle.engine.length > 100) return 'engine_too_long'
  if (vehicle.transmission.length > 100) return 'transmission_too_long'
  if (vehicle.trimLevel.length > 100) return 'trim_level_too_long'
  if (vehicle.otherPreferences.length > 2000) return 'other_preferences_too_long'

  if (!VALID_LOCALES.includes(locale)) return 'invalid_locale'

  return null
}

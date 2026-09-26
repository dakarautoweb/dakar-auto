import 'server-only'
import { isValidVin } from '@/src/lib/vin'
import { isValidWhatsAppRecipient, resolveWhatsAppInput } from '@/src/services/whatsapp/phone'
import type { SubmitPartsRequestInput } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SIDES = ['left', 'right', 'both']
const VALID_CONDITIONS = ['oem', 'aftermarket', 'used', 'no_preference']
const VALID_CONTACT_METHODS = ['whatsapp', 'phone', 'email']
const VALID_LOCALES = ['en', 'fr']

export function validateSubmitPartsRequestInput(input: SubmitPartsRequestInput): string | null {
  const { vehicle, part, contact, locale } = input

  if (vehicle.source === 'vin') {
    if (!vehicle.vin || !isValidVin(vehicle.vin)) return 'invalid_vin'
  } else if (vehicle.source !== 'manual') {
    return 'invalid_vehicle_source'
  }
  if (!vehicle.make.trim() || !vehicle.model.trim()) return 'missing_vehicle'

  if (!part.category.trim()) return 'missing_category'
  if (!part.partName.trim()) return 'missing_part_name'
  if (part.side !== null && !VALID_SIDES.includes(part.side)) return 'invalid_side'
  if (!VALID_CONDITIONS.includes(part.condition)) return 'invalid_condition'
  if (!Number.isInteger(part.quantity) || part.quantity < 1 || part.quantity > 99) return 'invalid_quantity'
  if (part.description.length > 2000) return 'description_too_long'

  if (!contact.name.trim()) return 'missing_name'
  if (!contact.phone.trim()) return 'missing_phone'
  if (contact.email && !EMAIL_PATTERN.test(contact.email)) return 'invalid_email'
  if (!VALID_CONTACT_METHODS.includes(contact.preferredContact)) return 'invalid_contact_method'
  // The chosen channel must actually be reachable — the customer
  // confirmation is sent only there (see sendPartsRequestNotifications).
  if (contact.preferredContact === 'whatsapp') {
    const whatsapp = resolveWhatsAppInput(contact)
    if (!whatsapp) return 'missing_whatsapp_phone'
    if (!isValidWhatsAppRecipient(whatsapp)) return 'invalid_whatsapp_phone'
  }
  if (contact.preferredContact === 'email' && !contact.email.trim()) return 'missing_email'

  if (!VALID_LOCALES.includes(locale)) return 'invalid_locale'

  return null
}

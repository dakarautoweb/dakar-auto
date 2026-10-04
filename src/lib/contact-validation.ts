// Shared, side-effect-free contact normalization for both request flows.
// Keep this module safe for client components as well as Server Actions.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARACTERS = /^\+?[\d\s\-.()]+$/
const NANP_TEN_DIGITS = /^[2-9]\d{2}[2-9]\d{6}$/
const E164_MIN_DIGITS = 8
const E164_MAX_DIGITS = 15

export function normalizeEmail(raw: string): string {
  return raw.trim()
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(raw))
}

// Canadian (and other NANP) numbers commonly arrive without +1. Convert a
// valid ten-digit national number to E.164. Already-international numbers
// keep their country code and are compacted to E.164 as well. Other local
// formats remain trimmed so the existing phone-contact flow keeps accepting
// countries whose local number cannot safely be assigned a country code.
export function normalizeContactPhone(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed || !PHONE_CHARACTERS.test(trimmed)) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (!trimmed.startsWith('+') && NANP_TEN_DIGITS.test(digits)) {
    return `+1${digits}`
  }

  if (
    trimmed.startsWith('+') &&
    digits.length >= E164_MIN_DIGITS &&
    digits.length <= E164_MAX_DIGITS &&
    !digits.startsWith('0')
  ) {
    return `+${digits}`
  }

  return trimmed
}

type ContactValues = {
  name: string
  email: string
  phone: string
  whatsappSameAsPhone: boolean
  whatsappPhone: string | null
}

// Normalize at the form/action boundary, before review, persistence, or any
// notification payload is built. When WhatsApp mirrors phone, it deliberately
// takes the normalized phone rather than validating stale hidden input state.
export function normalizeContactValues<T extends ContactValues>(contact: T): T {
  const phone = normalizeContactPhone(contact.phone)
  const whatsappPhone = contact.whatsappSameAsPhone
    ? phone
    : contact.whatsappPhone === null
      ? null
      : normalizeContactPhone(contact.whatsappPhone)

  return {
    ...contact,
    name: contact.name.trim(),
    email: normalizeEmail(contact.email),
    phone,
    whatsappPhone,
  }
}

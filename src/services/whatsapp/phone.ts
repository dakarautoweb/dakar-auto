// Pure helpers — no server-only import, so the contact form can run the
// exact same check the server does before a request is submitted.
//
// Meta's Cloud API wants the recipient as international digits only
// (country code + national number, no "+", no formatting). This never
// guesses a country code: a number is only accepted when it is clearly
// international already.
//
// Accepted shapes (formatting characters: spaces, "-", ".", "(", ")"):
// - "+<digits>"  e.g. "+221 77 123 45 67"  → 8–15 digits (E.164 range)
// - "00<digits>" e.g. "00221 77 123 45 67" → the international dialing prefix
// - Canadian/NANP national numbers e.g. "(514) 555-1234" → country code 1
// - "<digits>"   e.g. "1-514-555-1234"      → 11–15 digits otherwise.
// In every case the country code can't start with 0 — that's a national
// trunk prefix ("06 12 34 56 78"), i.e. a local number.
//
// Everything stays a string: phone numbers are never converted with
// Number()/parseInt, which would drop leading digits or lose precision.

import { normalizeContactPhone } from '@/src/lib/contact-validation'

const E164_MIN_DIGITS = 8
const E164_MAX_DIGITS = 15
const BARE_MIN_DIGITS = 11
const ALLOWED_CHARACTERS = /^\+?[\d\s\-.()]+$/

export function normalizeWhatsAppRecipient(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = normalizeContactPhone(raw)
  if (!trimmed || !ALLOWED_CHARACTERS.test(trimmed)) return null

  let digits = trimmed.replace(/\D/g, '')
  let minDigits = BARE_MIN_DIGITS
  if (trimmed.startsWith('+')) {
    minDigits = E164_MIN_DIGITS
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
    minDigits = E164_MIN_DIGITS
  }

  if (digits.length < minDigits || digits.length > E164_MAX_DIGITS) return null
  if (digits.startsWith('0')) return null
  return digits
}

export function isValidWhatsAppRecipient(raw: string | null | undefined): boolean {
  return normalizeWhatsAppRecipient(raw) !== null
}

// The number the customer wants WhatsApp messages on — mirrors how
// createPartsRequestRecord resolves whatsapp_phone.
export function resolveWhatsAppInput(contact: {
  phone: string
  whatsappSameAsPhone: boolean
  whatsappPhone: string | null
}): string {
  return normalizeContactPhone(contact.whatsappSameAsPhone ? contact.phone : contact.whatsappPhone ?? '')
}

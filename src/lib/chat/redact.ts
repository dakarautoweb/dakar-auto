// Best-effort redaction of obvious personal identifiers before free text is
// sent to the AI provider. This is a safety net, not PII detection: it
// catches well-formed emails, phone numbers, 17-character VINs and UUIDs
// (tracking tokens). The secure recovery flow is what keeps contact details
// out of the AI channel in the first place — see buildAiHistory().

export const REDACTED = {
  email: '[EMAIL]',
  phone: '[PHONE]',
  vin: '[VIN]',
  token: '[TRACKING_TOKEN]',
} as const

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
// VIN alphabet (no I, O, Q), exactly 17 characters, containing at least
// one digit and one letter so an ordinary 17-letter word is left alone.
const VIN = /\b(?=[A-HJ-NPR-Z0-9]*\d)(?=[A-HJ-NPR-Z0-9]*[A-HJ-NPR-Z])[A-HJ-NPR-Z0-9]{17}\b/gi
// A run of digits with common phone separators, optionally led by "+".
const PHONE_CANDIDATE = /(?:\+|\b)\d[\d\s().-]{5,}\d\b/g

// "+221 77 123 45 67", "00221…" or 9+ bare digits ("771234567") are
// phone-like. Kept out: year ranges ("2015-2019"), thousands-grouped
// amounts ("15 000 000"), mileages and anything under 9 digits.
function looksLikePhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '')
  if (digits.length > 15) return false
  if (candidate.startsWith('+') || digits.startsWith('00')) return digits.length >= 8
  if (digits.length < 9) return false
  if (/^(?:19|20)\d{2}\s*[-–/]\s*(?:19|20)\d{2}$/.test(candidate.trim())) return false
  if (/^\d{1,3}(?:[\s.,]\d{3})+$/.test(candidate.trim())) return false
  return true
}

export function redactPii(text: string): string {
  return text
    .replace(EMAIL, REDACTED.email)
    .replace(UUID, REDACTED.token)
    .replace(VIN, REDACTED.vin)
    // Dakar Auto request numbers (DA-2026-000183, VR-000123) are kept.
    .replace(PHONE_CANDIDATE, (match, offset: number, whole: string) =>
      looksLikePhone(match) && !/[A-Z]{2}-$/i.test(whole.slice(Math.max(0, offset - 3), offset)) ? REDACTED.phone : match,
    )
}

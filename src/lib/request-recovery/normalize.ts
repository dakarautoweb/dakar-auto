// Pure, deterministic normalization for the lost-request recovery flow —
// shared by the chat widget (light client-side validation) and the server
// (the actual matching). No fuzzy matching anywhere: values are normalized
// and then compared exactly.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARACTERS = /^\+?[\d\s\-.()]+$/
const MIN_PHONE_DIGITS = 8
const MAX_PHONE_DIGITS = 15
// A local number is matched against a stored international one (or vice
// versa) only when the local part is at least this long — Senegal mobiles
// are 9 digits.
const MIN_LOCAL_PHONE_DIGITS = 9
const MAX_COUNTRY_CODE_DIGITS = 3
export const MAX_CONTACT_LENGTH = 254
export const MAX_LAST_NAME_LENGTH = 80

export type RecoveryContact = { kind: 'email'; email: string } | { kind: 'phone'; digits: string }

// Same convention as the tracking lookup (lookup-tracking-token.ts):
// trimmed and lowercased.
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

// Digits only; an international "00" prefix is dropped so "00221…" and
// "+221…" compare equal.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return raw.trim().startsWith('+') ? digits : digits.replace(/^00/, '')
}

export function parseRecoveryContact(raw: unknown): RecoveryContact | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || value.length > MAX_CONTACT_LENGTH) return null
  if (value.includes('@')) return EMAIL_PATTERN.test(value) ? { kind: 'email', email: normalizeEmail(value) } : null
  if (!PHONE_CHARACTERS.test(value)) return null
  const digits = normalizePhone(value)
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS ? { kind: 'phone', digits } : null
}

// Equal digits, or the same number with/without a country code
// ("771234567" vs "+221 77 123 45 67").
export function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a]
  return (
    shorter.length >= MIN_LOCAL_PHONE_DIGITS &&
    longer.length - shorter.length <= MAX_COUNTRY_CODE_DIGITS &&
    longer.endsWith(shorter)
  )
}

// Lowercase, accents removed, apostrophes dropped ("N'Diaye" → "ndiaye"),
// hyphens and other separators turned into single spaces.
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function parseLastName(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > MAX_LAST_NAME_LENGTH) return null
  const name = normalizeName(raw)
  return name.replace(/\s/g, '').length >= 2 ? name : null
}

// Requests store one free-form full name (customer_name). The last name
// must appear in it as whole word(s), in order — "diop" matches
// "Mamadou Diop" and "DIOP Mamadou", never "Diopp" or "Adiop".
export function lastNameMatches(storedFullName: string | null | undefined, lastName: string): boolean {
  if (!storedFullName || !lastName) return false
  const stored = normalizeName(storedFullName).split(' ')
  const wanted = lastName.split(' ')
  for (let i = 0; i + wanted.length <= stored.length; i += 1) {
    if (wanted.every((word, j) => stored[i + j] === word)) return true
  }
  return false
}

// Single source of truth for Dakar Auto's own public contact info and site
// identity — every public component reads from here instead of hardcoding
// its own copy (previously duplicated: contact.email.value/contact.phone.value
// in en.json/fr.json, and a separate PLACEHOLDER_WHATSAPP_LINK literal
// re-declared in four email templates). Placeholder values below, replace
// with the real ones before launch.
export const SITE_NAME = 'Dakar Auto'

export const EMAIL_ADDRESS = 'contact@dakarauto.com'

// Clean, tel:-ready digits (with country code) — never format this one for
// display, use PHONE_DISPLAY below for that.
export const PHONE_NUMBER = '+22100000000'
// Human-readable form of the same placeholder number, for display text only
// (e.g. the homepage contact section, the footer). tel:/sms: links must
// always use PHONE_NUMBER above, never this one.
export const PHONE_DISPLAY = '+221 00 000 00 00'

// Clean digits only — no "+", no spaces — this is what a wa.me link
// requires. WHATSAPP_LINK is always built from this, never hardcoded as its
// own literal.
//
// Note: this placeholder currently has one more digit than PHONE_NUMBER's
// placeholder (12 vs 11) — that mismatch predates this file's
// centralization and was preserved as-is rather than "fixed" (item 5: don't
// invent real data). Worth double-checking when these are replaced with
// real numbers, in case the business phone and WhatsApp number are meant to
// be the same one.
export const WHATSAPP_NUMBER = '221000000000'
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`

const PLACEHOLDER_WHATSAPP_NUMBER = '221000000000'
// True once WHATSAPP_NUMBER has been changed from the placeholder above.
// Email templates use this to decide whether to show a WhatsApp CTA at all
// instead of linking to a number nobody's watching.
export const HAS_REAL_WHATSAPP = WHATSAPP_NUMBER !== PLACEHOLDER_WHATSAPP_NUMBER

// No physical address is configured yet — left null rather than invented.
// Once Dakar Auto has a public address to show, set it here and it becomes
// available everywhere through this same import.
export const ADDRESS: string | null = null

// Turns a display-formatted phone number ("+221 77 123 45 67") into a
// tel:-ready value — strips everything except a leading "+" and digits.
// Used for the site_settings-backed phone/WhatsApp fields, which are
// stored as whatever the admin typed (see Admin -> Paramètres ->
// "Informations de l'entreprise") rather than as separate display/link
// columns.
export function normalizePhoneDigits(raw: string): string {
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^0-9]/g, '')
  return hasPlus ? `+${digits}` : digits
}

// wa.me links take digits only, no leading "+".
export function buildWhatsAppLinkFrom(raw: string): string {
  return `https://wa.me/${normalizePhoneDigits(raw).replace(/^\+/, '')}`
}

// Absolute base URL for links that leave the app (emails, anything sent to
// an external inbox) — a relative path only works inside the site itself.
// Set NEXT_PUBLIC_APP_URL to the deployed app's real origin (Vercel URL or
// custom domain, once one is live) — never hardcode a domain here, since
// there's no guarantee it points at whatever app is actually deployed.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')

// A customer's tracking_token is a random, unguessable UUID (see
// parts_requests.tracking_token) — this is the only thing that gates
// access to their request status, so it's never derived from
// request_number or any other public-facing value.
export function buildTrackingUrl(trackingToken: string): string {
  return `${SITE_URL}/track/${trackingToken}`
}

import 'server-only'
import { Resend } from 'resend'

// Until a verified Dakar Auto domain is configured in Resend, fall back to
// Resend's shared onboarding sender. Resend only accepts that sender for
// mail addressed to the Resend account's own email — every other recipient
// is rejected — so it is for development/testing only.
//
// Once a domain is verified, set RESEND_FROM_EMAIL (e.g.
// "Dakar Auto <noreply@dakarauto.com>") and sending switches automatically —
// no code change needed.
const DEV_FALLBACK_SENDER = 'Dakar Auto <onboarding@resend.dev>'

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL?.trim() || DEV_FALLBACK_SENDER
export const EMAIL_FROM_USES_FALLBACK = EMAIL_FROM === DEV_FALLBACK_SENDER

export const ADMIN_EMAIL = process.env.DAKAR_ADMIN_EMAIL?.trim() || null

// Trimmed: a whitespace-only value must not produce a client.
const apiKey = process.env.RESEND_API_KEY?.trim()

// `resendClient` is null when no API key is configured so callers can no-op
// instead of throwing — email sending is always best-effort.
export const resendClient = apiKey ? new Resend(apiKey) : null

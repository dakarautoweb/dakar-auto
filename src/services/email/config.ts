import 'server-only'
import { Resend } from 'resend'

// Until a verified Dakar Auto domain is configured in Resend, fall back to
// Resend's shared onboarding sender, which is permitted to send to any
// recipient during development/testing.
//
// Once a domain is verified, set RESEND_FROM_EMAIL (e.g.
// "Dakar Auto <noreply@dakarauto.com>") and sending switches automatically —
// no code change needed.
const DEV_FALLBACK_SENDER = 'Dakar Auto <onboarding@resend.dev>'

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL?.trim() || DEV_FALLBACK_SENDER

export const ADMIN_EMAIL = process.env.DAKAR_ADMIN_EMAIL?.trim() || null

const apiKey = process.env.RESEND_API_KEY

// `resendClient` is null when no API key is configured so callers can no-op
// instead of throwing — email sending is always best-effort.
export const resendClient = apiKey ? new Resend(apiKey) : null

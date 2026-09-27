import 'server-only'
import { resendClient } from '@/src/services/email/config'

// HMAC key for stored verification-code hashes. Required — without it (or
// without Resend to deliver the code) the flow reports itself unavailable
// rather than falling back to a weaker scheme.
export function getRecoverySecret(): string | null {
  const secret = process.env.REQUEST_RECOVERY_SECRET?.trim()
  return secret && secret.length >= 32 ? secret : null
}

export function isRecoveryConfigured(): boolean {
  return Boolean(getRecoverySecret() && resendClient)
}

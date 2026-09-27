import 'server-only'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const OTP_DIGITS = 6
export const OTP_TTL_MS = 10 * 60_000
// Wrong codes allowed per challenge (resending does not reset this).
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_MS = 60_000
// Emails per challenge, including the first one.
export const OTP_MAX_SENDS = 3
// New challenges (i.e. verification emails) per request per hour.
export const MAX_CHALLENGES_PER_REQUEST_PER_HOUR = 3

const OTP_PATTERN = new RegExp(`^\\d{${OTP_DIGITS}}$`)

// crypto.randomInt is a CSPRNG with no modulo bias.
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0')
}

export function isOtpFormat(code: unknown): code is string {
  return typeof code === 'string' && OTP_PATTERN.test(code)
}

// Only this keyed hash is stored — never the code. Binding the challenge id
// in means a hash can't be replayed onto another challenge.
export function hashOtp(secret: string, challengeId: string, code: string): string {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex')
}

export function otpMatches(secret: string, challengeId: string, code: string, storedHash: string): boolean {
  const expected = Buffer.from(hashOtp(secret, challengeId, code), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  return expected.length === stored.length && timingSafeEqual(expected, stored)
}

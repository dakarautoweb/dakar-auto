import 'server-only'
import { randomUUID } from 'node:crypto'
import { lastNameMatches, parseLastName, parseRecoveryContact, phonesMatch, type RecoveryContact } from '@/src/lib/request-recovery/normalize'
import { maskEmail } from '@/src/lib/request-recovery/mask'
import type { RecoveryDiscriminator, RecoveryPeriod } from '@/src/lib/request-recovery/types'
import {
  generateOtp,
  hashOtp,
  isOtpFormat,
  MAX_CHALLENGES_PER_REQUEST_PER_HOUR,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  otpMatches,
} from './otp'
import type { RecoveredRequestRecord, RecoveryCandidate, RecoveryRepository } from './types'

// Deterministic lost-request recovery. No AI is involved anywhere in this
// module: contact details, names, codes and request data stay between the
// browser, this server and the database.
//
// 1. lookup: contact (email OR phone) + last name → exact normalized match.
//    Several matches → ask ONE discriminator (request type, else period).
//    One match with an email on file → email a one-time code.
//    Still several → never guess: if they all share one email, a single
//    code covers them all; otherwise "needs_assistance" (contact Dakar Auto).
//    Anything else → the same neutral "not found" answer.
// 2. verify: code → only now is anything about the request(s) revealed;
//    several verified requests are listed for the customer to choose from.
// 3. resend: new code for the same challenge, with a cooldown.

export type RecoveryDeps = {
  repo: RecoveryRepository
  secret: string
  sendCode: (email: string, code: string) => Promise<boolean>
  now?: () => Date
  generateCode?: () => string
  generateId?: () => string
}

export type LookupOutcome =
  | { status: 'invalid_input' | 'not_found' | 'rate_limited' | 'delivery_failed' | 'needs_assistance' }
  | { status: 'need_discriminator'; discriminator: 'kind' | 'period' }
  | { status: 'code_sent'; challengeId: string; destination: string; resendAfterSeconds: number }

export type VerifyOutcome =
  | { status: 'verified'; request: RecoveredRequestRecord }
  | { status: 'verified_multiple'; requests: RecoveredRequestRecord[] }
  | { status: 'invalid_code'; attemptsLeft: number }
  | { status: 'expired' | 'locked' }

export type ResendOutcome =
  | { status: 'code_sent'; challengeId: string; destination: string; resendAfterSeconds: number }
  | { status: 'cooldown'; retryAfterSeconds: number }
  | { status: 'expired' | 'rate_limited' | 'delivery_failed' }

const DAY_MS = 24 * 60 * 60_000
// Deliberately overlapping: a customer's "about a month ago" is fuzzy.
const PERIOD_AGE_DAYS: Record<RecoveryPeriod, [number, number]> = {
  week: [0, 10],
  month: [5, 40],
  quarter: [25, 100],
  older: [80, Infinity],
}

// Beyond this many verified matches the list stops being a quick choice.
export const MAX_REQUESTS_PER_CHALLENGE = 10

const UUID_PATTERN =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function contactMatches(candidate: RecoveryCandidate, contact: RecoveryContact): boolean {
  if (contact.kind === 'email') return candidate.email?.trim().toLowerCase() === contact.email
  return candidate.phones.some((phone) => phonesMatch(phone.replace(/\D/g, '').replace(/^00/, ''), contact.digits))
}

export function matchesPeriod(createdAt: string, period: RecoveryPeriod, now: Date): boolean {
  const ageDays = (now.getTime() - new Date(createdAt).getTime()) / DAY_MS
  const [min, max] = PERIOD_AGE_DAYS[period]
  return ageDays >= min && ageDays <= max
}

// Request type when the matches differ in type (the clearest question for
// a customer), otherwise the approximate period.
export function chooseDiscriminator(candidates: RecoveryCandidate[]): 'kind' | 'period' {
  return new Set(candidates.map((c) => c.kind)).size > 1 ? 'kind' : 'period'
}

function applyDiscriminator(candidates: RecoveryCandidate[], discriminator: RecoveryDiscriminator, now: Date): RecoveryCandidate[] {
  if (discriminator.type === 'kind') return candidates.filter((c) => c.kind === discriminator.value)
  return candidates.filter((c) => matchesPeriod(c.createdAt, discriminator.value, now))
}

// The one email every remaining candidate shares, or null. Several matches
// are only ever verified together when a single mailbox owns all of them —
// otherwise there is no safe place to send the code and no request is
// picked on the customer's behalf.
export function sharedEmail(candidates: RecoveryCandidate[]): string | null {
  const emails = new Set(candidates.map((c) => c.email?.trim().toLowerCase() ?? ''))
  if (emails.size !== 1 || emails.has('')) return null
  return candidates[0].email!.trim()
}

export async function lookupRequest(
  input: { contact: unknown; lastName: unknown; discriminator?: RecoveryDiscriminator | null },
  deps: RecoveryDeps,
): Promise<LookupOutcome> {
  const contact = parseRecoveryContact(input.contact)
  const lastName = parseLastName(input.lastName)
  // Both identifiers are required before the database is touched at all.
  if (!contact || !lastName) return { status: 'invalid_input' }

  const now = deps.now?.() ?? new Date()
  const rows = await deps.repo.findCandidates(contact)
  let matches = rows.filter((c) => contactMatches(c, contact) && lastNameMatches(c.customerName, lastName))
  if (matches.length === 0) return { status: 'not_found' }

  if (matches.length > 1) {
    // The discriminator only narrows down requests that already matched
    // contact + name — it is never used to authenticate on its own.
    if (!input.discriminator) return { status: 'need_discriminator', discriminator: chooseDiscriminator(matches) }
    matches = applyDiscriminator(matches, input.discriminator, now)
    if (matches.length === 0) return { status: 'not_found' }
  }

  // Email is the only verification channel (no SMS provider in this
  // project). A single request without one gets the exact same answer as
  // no match, so the response can't be used to learn that a request exists.
  if (matches.length === 1 && !matches[0].email) return { status: 'not_found' }

  // Still several after the one discriminator: never guess (e.g. "the most
  // recent"). They are verified together only if one email owns them all;
  // otherwise — e.g. recovery by phone across requests with different or
  // missing emails — the customer is sent to Dakar Auto. The existence of
  // several matches was already implied by the discriminator question.
  const email = sharedEmail(matches)
  if (!email || matches.length > MAX_REQUESTS_PER_CHALLENGE) return { status: 'needs_assistance' }

  const since = new Date(now.getTime() - 60 * 60_000).toISOString()
  const counts = await Promise.all(matches.map((c) => deps.repo.countChallengesSince({ kind: c.kind, id: c.requestId }, since)))
  if (counts.some((count) => count >= MAX_CHALLENGES_PER_REQUEST_PER_HOUR)) return { status: 'rate_limited' }

  const challengeId = (deps.generateId ?? randomUUID)()
  const code = (deps.generateCode ?? generateOtp)()
  await deps.repo.createChallenge({
    id: challengeId,
    requests: matches.map((c) => ({ kind: c.kind, id: c.requestId })),
    codeHash: hashOtp(deps.secret, challengeId, code),
    attempts: 0,
    sendCount: 1,
    lastSentAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
    consumedAt: null,
  })

  if (!(await deps.sendCode(email, code))) {
    // A code nobody received must not stay usable.
    await deps.repo.updateChallenge(challengeId, 0, { consumedAt: now.toISOString() })
    return { status: 'delivery_failed' }
  }

  // Same response shape whether one or several requests are covered.
  return { status: 'code_sent', challengeId, destination: maskEmail(email), resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000 }
}

export async function verifyCode(input: { challengeId: unknown; code: unknown }, deps: RecoveryDeps): Promise<VerifyOutcome> {
  if (typeof input.challengeId !== 'string' || !UUID_PATTERN.test(input.challengeId)) return { status: 'expired' }
  const challenge = await deps.repo.getChallenge(input.challengeId)
  const now = deps.now?.() ?? new Date()
  if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt) <= now) return { status: 'expired' }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) return { status: 'locked' }

  // Every submission costs an attempt, including malformed ones.
  const attempts = challenge.attempts + 1
  if (!(await deps.repo.updateChallenge(challenge.id, challenge.attempts, { attempts }))) {
    return { status: 'invalid_code', attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - attempts) }
  }

  if (!isOtpFormat(input.code) || !otpMatches(deps.secret, challenge.id, input.code, challenge.codeHash)) {
    const attemptsLeft = OTP_MAX_ATTEMPTS - attempts
    return attemptsLeft > 0 ? { status: 'invalid_code', attemptsLeft } : { status: 'locked' }
  }

  // Single use: consumed before anything is returned.
  if (!(await deps.repo.updateChallenge(challenge.id, attempts, { consumedAt: now.toISOString() }))) return { status: 'expired' }

  const found = await Promise.all(challenge.requests.map((ref) => deps.repo.getRecoveredRequest(ref.kind, ref.id)))
  const requests = found.filter((r): r is RecoveredRequestRecord => r !== null)
  if (requests.length === 0) return { status: 'expired' }
  if (requests.length === 1) return { status: 'verified', request: requests[0] }
  // Newest first is only the display order — the customer chooses.
  return { status: 'verified_multiple', requests: requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
}

export async function resendCode(input: { challengeId: unknown }, deps: RecoveryDeps): Promise<ResendOutcome> {
  if (typeof input.challengeId !== 'string' || !UUID_PATTERN.test(input.challengeId)) return { status: 'expired' }
  const challenge = await deps.repo.getChallenge(input.challengeId)
  const now = deps.now?.() ?? new Date()
  if (!challenge || challenge.consumedAt || challenge.attempts >= OTP_MAX_ATTEMPTS) return { status: 'expired' }

  const waitMs = new Date(challenge.lastSentAt).getTime() + OTP_RESEND_COOLDOWN_MS - now.getTime()
  if (waitMs > 0) return { status: 'cooldown', retryAfterSeconds: Math.ceil(waitMs / 1000) }
  if (challenge.sendCount >= OTP_MAX_SENDS) return { status: 'rate_limited' }

  // Re-read every covered request: the code only goes out again if they
  // still share one email.
  const emails = await Promise.all(challenge.requests.map((ref) => deps.repo.getRequestEmail(ref.kind, ref.id)))
  const normalized = new Set(emails.map((e) => e?.trim().toLowerCase() ?? ''))
  if (normalized.size !== 1 || normalized.has('')) return { status: 'expired' }
  const email = emails[0]!.trim()

  // A new code replaces the old one; the attempt counter carries over.
  const code = (deps.generateCode ?? generateOtp)()
  const updated = await deps.repo.updateChallenge(challenge.id, challenge.attempts, {
    codeHash: hashOtp(deps.secret, challenge.id, code),
    sendCount: challenge.sendCount + 1,
    lastSentAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
  })
  if (!updated) return { status: 'expired' }
  if (!(await deps.sendCode(email, code))) return { status: 'delivery_failed' }

  return { status: 'code_sent', challengeId: challenge.id, destination: maskEmail(email), resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000 }
}

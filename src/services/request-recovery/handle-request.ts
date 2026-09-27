import 'server-only'
import { defaultLocale, isLocale, type Locale } from '@/src/i18n/config'
import { getDictionary } from '@/src/i18n/dictionaries'
import { resendClient } from '@/src/services/email/config'
import { sendRequestRecoveryCodeEmail } from '@/src/services/email'
import { clientKeyFromRequest, createMemoryRateLimiter } from '@/src/services/rate-limit/memory-rate-limiter'
import { RECOVERY_PERIODS, type RecoveredRequest, type RecoveryApiResponse, type RecoveryDiscriminator } from '@/src/lib/request-recovery/types'
import { getRecoverySecret } from './config'
import { lookupRequest, resendCode, verifyCode, type RecoveryDeps } from './flow'
import { OTP_TTL_MS } from './otp'
import { supabaseRecoveryRepository } from './repository'
import type { RecoveredRequestRecord } from './types'

const MAX_BODY_BYTES = 2048
const WINDOW_MS = 15 * 60_000

// Per-client (IP) limits, in addition to the database-enforced limits in
// flow.ts. Process-local only — see memory-rate-limiter.ts.
const limiters = {
  lookup: createMemoryRateLimiter({ windowMs: WINDOW_MS, max: 5 }),
  verify: createMemoryRateLimiter({ windowMs: WINDOW_MS, max: 12 }),
  resend: createMemoryRateLimiter({ windowMs: WINDOW_MS, max: 4 }),
}

function reply(body: RecoveryApiResponse, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function parseDiscriminator(raw: unknown): RecoveryDiscriminator | null {
  if (!raw || typeof raw !== 'object') return null
  const { type, value } = raw as { type?: unknown; value?: unknown }
  if (type === 'kind' && (value === 'parts' || value === 'vehicle')) return { type, value }
  if (type === 'period' && typeof value === 'string' && (RECOVERY_PERIODS as readonly string[]).includes(value)) {
    return { type, value: value as (typeof RECOVERY_PERIODS)[number] }
  }
  return null
}

async function toPublicRequest(record: RecoveredRequestRecord, locale: Locale): Promise<RecoveredRequest> {
  const dict = await getDictionary(locale)
  const labels: Record<string, string> = record.kind === 'parts' ? dict.admin.statuses : dict.admin.vehicleStatuses
  return {
    requestNumber: record.requestNumber,
    kind: record.kind,
    vehicleLabel: record.vehicleLabel,
    statusLabel: labels[record.status] ?? record.status,
    createdAt: record.createdAt,
    trackingPath: `/track/${record.trackingToken}`,
  }
}

export async function handleRecoveryRequest(request: Request): Promise<Response> {
  const secret = getRecoverySecret()
  if (!secret || !resendClient) {
    console.error('[request-recovery] Not configured: REQUEST_RECOVERY_SECRET and RESEND_API_KEY are required')
    return reply({ status: 'unavailable' }, 503)
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return reply({ status: 'invalid_input' }, 413)

  let body: Record<string, unknown>
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return reply({ status: 'invalid_input' }, 413)
    body = JSON.parse(text)
    if (!body || typeof body !== 'object') throw new Error('not an object')
  } catch {
    return reply({ status: 'invalid_input' }, 400)
  }

  const action = body.action
  if (action !== 'lookup' && action !== 'verify' && action !== 'resend') return reply({ status: 'invalid_input' }, 400)
  if (limiters[action].isLimited(clientKeyFromRequest(request))) return reply({ status: 'rate_limited' }, 429)

  const locale: Locale = typeof body.locale === 'string' && isLocale(body.locale) ? body.locale : defaultLocale
  const deps: RecoveryDeps = {
    repo: supabaseRecoveryRepository,
    secret,
    sendCode: (email, code) => sendRequestRecoveryCodeEmail(email, { code, locale, expiresInMinutes: OTP_TTL_MS / 60_000 }),
  }

  try {
    if (action === 'lookup') {
      return reply(await lookupRequest({ contact: body.contact, lastName: body.lastName, discriminator: parseDiscriminator(body.discriminator) }, deps))
    }
    if (action === 'verify') {
      const outcome = await verifyCode({ challengeId: body.challengeId, code: body.code }, deps)
      if (outcome.status === 'verified') return reply({ status: 'verified', request: await toPublicRequest(outcome.request, locale) })
      if (outcome.status === 'verified_multiple') {
        return reply({ status: 'verified_multiple', requests: await Promise.all(outcome.requests.map((r) => toPublicRequest(r, locale))) })
      }
      return reply(outcome)
    }
    return reply(await resendCode({ challengeId: body.challengeId }, deps))
  } catch (err) {
    // Repository errors are already logged without customer data.
    console.error('[request-recovery] action failed:', action, err instanceof Error ? err.message : 'unknown')
    return reply({ status: 'unavailable' }, 503)
  }
}

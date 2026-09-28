import 'server-only'
import { headers } from 'next/headers'

// Cloudflare's official token-verification endpoint — this is the ONLY
// source of truth for whether a Turnstile challenge actually passed. A
// client-side "success" callback firing means nothing on its own (a bot can
// call it directly, or skip the widget and send an arbitrary string as the
// token) — every public form action that renders TurnstileWidget must call
// this before doing anything else, and treat any non-ok result as "block
// the operation," never as a soft warning.
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5000

// Safe, coarse label for a siteverify rejection so the logs say which layer
// broke: our secret (wrong/other widget's secret → key mismatch), the token
// (expired, reused or forged), or something else. Never includes the token.
export type TurnstileFailureCategory = 'secret_invalid' | 'token_expired_or_reused' | 'token_invalid' | 'other'

export function categorizeSiteverifyErrors(codes: string[]): TurnstileFailureCategory {
  if (codes.some((c) => c === 'invalid-input-secret' || c === 'missing-input-secret')) return 'secret_invalid'
  if (codes.includes('timeout-or-duplicate')) return 'token_expired_or_reused'
  if (codes.some((c) => c === 'invalid-input-response' || c === 'missing-input-response')) return 'token_invalid'
  return 'other'
}

// The host this deployment is expected to serve (NEXT_PUBLIC_APP_URL), used
// only to flag a solved challenge coming from somewhere else.
function expectedHostname(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '').hostname || null
  } catch {
    return null
  }
}

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing_token' | 'invalid_token' | 'timeout' | 'server_error' }

async function getClientIp(): Promise<string | undefined> {
  try {
    const headerList = await headers()
    const forwardedFor = headerList.get('x-forwarded-for')
    if (forwardedFor) return forwardedFor.split(',')[0].trim()
    return headerList.get('x-real-ip') ?? undefined
  } catch {
    // headers() only works inside a request context — callers outside one
    // (there are none today, but this keeps the function safe either way)
    // just skip sending remoteip, which siteverify treats as optional.
    return undefined
  }
}

// Verifies a Turnstile token server-side. Never throws — every failure mode
// (missing token, Cloudflare says invalid, network timeout, misconfigured
// secret) resolves to a typed { ok: false } result so callers can uniformly
// "fail safe" (block the operation) without a try/catch of their own.
//
// Never logs the token or the secret in full — only Cloudflare's own
// non-sensitive error-codes (e.g. "timeout-or-duplicate",
// "invalid-input-response") and, on success, the hostname Cloudflare
// resolved the challenge against (useful for spotting a token replayed from
// a different origin than expected; informational only — Cloudflare's
// dashboard already scopes which hostnames a site key accepts, so this
// isn't a second hard gate, just a diagnostic signal in server logs).
export async function verifyTurnstileToken(token: string | null | undefined): Promise<TurnstileVerifyResult> {
  if (!token || !token.trim()) return { ok: false, reason: 'missing_token' }

  // Trimmed like the public site key: a pasted trailing newline would
  // otherwise make Cloudflare reject every token as invalid-input-secret.
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not configured — failing safe (blocking)')
    return { ok: false, reason: 'server_error' }
  }

  const remoteIp = await getClientIp()
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: controller.signal })

    if (!res.ok) {
      console.error('[turnstile] siteverify responded with HTTP', res.status)
      return { ok: false, reason: 'server_error' }
    }

    const data = (await res.json()) as { success: boolean; hostname?: string; 'error-codes'?: string[] }

    if (!data.success) {
      // hostname (when Cloudflare returns it) is the domain the token was
      // solved on — not secret, and it shows which deployment/domain the
      // failing submits come from. "invalid-input-secret" or
      // "invalid-input-response" on every submit usually means the site key
      // and TURNSTILE_SECRET_KEY belong to different Turnstile widgets.
      const codes = data['error-codes'] ?? []
      const category = categorizeSiteverifyErrors(codes)
      const log = category === 'secret_invalid' ? console.error : console.warn
      log(
        `[turnstile] verification failed: category=${category} error-codes=${codes.join(',') || 'unknown'}`,
        data.hostname ? `hostname=${data.hostname}` : ''
      )
      return { ok: false, reason: 'invalid_token' }
    }

    // Informational only (Cloudflare's hostname allow-list is the real
    // gate): a mismatch points at a preview/other domain or a wrong
    // NEXT_PUBLIC_APP_URL. localhost is expected in development.
    const expected = expectedHostname()
    if (data.hostname && expected && data.hostname !== expected && process.env.NODE_ENV === 'production') {
      console.warn(`[turnstile] verified on unexpected hostname=${data.hostname} (expected ${expected})`)
    }

    return { ok: true }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[turnstile] siteverify request timed out')
      return { ok: false, reason: 'timeout' }
    }
    console.error('[turnstile] siteverify request threw:', err instanceof Error ? err.message : 'Unknown error')
    return { ok: false, reason: 'server_error' }
  } finally {
    clearTimeout(timeoutId)
  }
}

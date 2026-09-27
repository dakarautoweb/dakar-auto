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

  const secret = process.env.TURNSTILE_SECRET_KEY
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
      console.warn(
        '[turnstile] verification failed, error-codes:',
        (data['error-codes'] ?? ['unknown']).join(','),
        data.hostname ? `hostname=${data.hostname}` : ''
      )
      return { ok: false, reason: 'invalid_token' }
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

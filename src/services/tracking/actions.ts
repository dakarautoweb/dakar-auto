'use server'

import { headers } from 'next/headers'
import { lookupTrackingToken } from './lookup-tracking-token'
import { lookupVehicleTrackingToken } from './lookup-vehicle-tracking-token'
import { isRateLimited } from './rate-limit'
import { verifyTurnstileToken } from '@/src/services/turnstile/verify'

export type TrackLookupResult = { ok: true; token: string } | { ok: false; reason: 'not_found' | 'rate_limited' | 'turnstile' }

async function getClientKey(): Promise<string> {
  const headerList = await headers()
  // Behind Vercel/most proxies this is the real client IP as the first
  // entry; if it's absent we fall back to a shared bucket, which is
  // strictly more restrictive (not less) than per-client limiting.
  const forwardedFor = headerList.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return headerList.get('x-real-ip') ?? 'unknown'
}

export async function trackLookupAction(requestNumber: string, contact: string, turnstileToken?: string): Promise<TrackLookupResult> {
  const clientKey = await getClientKey()
  // Rate limit first — it's free (in-memory, no network call) and Turnstile
  // doesn't replace it (item 9): a client already being throttled shouldn't
  // also cost us a call to Cloudflare's siteverify endpoint.
  if (isRateLimited(clientKey)) return { ok: false, reason: 'rate_limited' }

  const turnstileResult = await verifyTurnstileToken(turnstileToken)
  if (!turnstileResult.ok) return { ok: false, reason: 'turnstile' }

  // DA- => parts request, VR- => vehicle sourcing request. Anything else
  // (typo, no prefix) falls through to the parts lookup, same as before
  // this branch existed — not a behavior change for non-VR input.
  const normalized = requestNumber.trim().toUpperCase()
  const token = normalized.startsWith('VR-')
    ? await lookupVehicleTrackingToken(requestNumber, contact)
    : await lookupTrackingToken(requestNumber, contact)
  if (!token) return { ok: false, reason: 'not_found' }

  return { ok: true, token }
}

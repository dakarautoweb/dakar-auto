import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Generic HMAC-signed, short-lived bearer tokens for the direct-upload flow.
// Two distinct payload shapes ride on this (see upload-session.ts /
// request-upload-url.ts), discriminated by `kind` so a session token can
// never be replayed as a file token or vice versa. Deliberately NOT a JWT
// library dependency — this is a small, single-purpose, in-house format.

const SECRET = process.env.ATTACHMENT_UPLOAD_TOKEN_SECRET!

type TokenPayload = { kind: string; exp: number } & Record<string, unknown>

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function base64UrlDecode(input: string): string | null {
  try {
    return Buffer.from(input, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function signToken<T extends Record<string, unknown>>(payload: T & { kind: string }, ttlSeconds: number): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + ttlSeconds * 1000 }
  const encoded = base64UrlEncode(JSON.stringify(full))
  return `${encoded}.${sign(encoded)}`
}

// Never throws — every failure mode (malformed, bad signature, expired,
// wrong `kind`) collapses to `null` so callers can't leak which one
// occurred to the client.
export function verifyToken<T extends TokenPayload>(token: string, expectedKind: T['kind']): T | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encoded, signature] = parts

  const expectedSignature = sign(encoded)
  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSignature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const json = base64UrlDecode(encoded)
  if (!json) return null

  try {
    const payload = JSON.parse(json) as T
    if (payload.kind !== expectedKind) return null
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

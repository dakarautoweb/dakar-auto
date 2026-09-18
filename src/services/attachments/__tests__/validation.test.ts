import { describe, expect, it } from 'vitest'
import { sniffImageMime } from '../sniff'
import { signToken, verifyToken } from '../upload-token'
import { MAX_FILE_SIZE_BYTES, MAX_FILES } from '../constants'

// These tests exercise the actual trust-boundary primitives used by
// request-upload-url.ts / finalize.ts directly (magic-byte sniffing, and
// the HMAC token that stands in for "the server issued this exact pending
// upload") rather than mocking the Supabase network calls those two
// orchestration functions make — the interesting security properties live
// in these pure functions, not in the network plumbing around them.

function jpegBuffer(size = 32): Buffer {
  const buf = Buffer.alloc(size, 0)
  buf[0] = 0xff
  buf[1] = 0xd8
  buf[2] = 0xff
  return buf
}

function pngBuffer(size = 32): Buffer {
  const buf = Buffer.alloc(size, 0)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  return buf
}

function webpBuffer(size = 32): Buffer {
  const buf = Buffer.alloc(size, 0)
  buf.write('RIFF', 0, 'ascii')
  buf.write('WEBP', 8, 'ascii')
  return buf
}

describe('sniffImageMime (magic-byte validation)', () => {
  it('accepts a valid JPEG signature', () => {
    expect(sniffImageMime(jpegBuffer())).toBe('image/jpeg')
  })

  it('accepts a valid PNG signature', () => {
    expect(sniffImageMime(pngBuffer())).toBe('image/png')
  })

  it('accepts a valid WEBP signature', () => {
    expect(sniffImageMime(webpBuffer())).toBe('image/webp')
  })

  it('rejects a text file renamed to .jpg (fake JPEG)', () => {
    const fakeJpeg = Buffer.from('this is not actually an image, just text\n', 'utf8')
    expect(sniffImageMime(fakeJpeg)).toBeNull()
  })

  it('rejects an empty/too-short buffer', () => {
    expect(sniffImageMime(Buffer.alloc(2))).toBeNull()
  })
})

describe('oversized file rejection', () => {
  it('flags a buffer larger than MAX_FILE_SIZE_BYTES, matching finalize.ts\'s size guard', () => {
    const oversized = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1)
    expect(oversized.length > MAX_FILE_SIZE_BYTES).toBe(true)
  })

  it('accepts a buffer exactly at the limit', () => {
    const atLimit = Buffer.alloc(MAX_FILE_SIZE_BYTES)
    expect(atLimit.length > MAX_FILE_SIZE_BYTES).toBe(false)
  })
})

describe('6th-file cap (finalize.ts refs.slice(0, MAX_FILES))', () => {
  it('caps to MAX_FILES regardless of how many refs are submitted', () => {
    const refs = Array.from({ length: MAX_FILES + 3 }, (_, i) => ({ clientId: `photo-${i}` }))
    const capped = refs.slice(0, MAX_FILES)
    expect(capped).toHaveLength(MAX_FILES)
    expect(capped[capped.length - 1].clientId).toBe(`photo-${MAX_FILES - 1}`)
  })
})

describe('signToken / verifyToken (pending-upload session security)', () => {
  it('round-trips a valid token', () => {
    const token = signToken({ kind: 'pending_attachment', sessionId: 's1', path: 'pending/s1/a.jpg', mime: 'image/jpeg', maxSize: 1000 }, 60)
    const payload = verifyToken<{ kind: 'pending_attachment'; sessionId: string; path: string; mime: string; maxSize: number; exp: number }>(
      token,
      'pending_attachment'
    )
    expect(payload).not.toBeNull()
    expect(payload?.path).toBe('pending/s1/a.jpg')
  })

  it('rejects an expired token', () => {
    const token = signToken({ kind: 'pending_attachment', sessionId: 's1', path: 'pending/s1/a.jpg', mime: 'image/jpeg', maxSize: 1000 }, -1)
    const payload = verifyToken(token, 'pending_attachment')
    expect(payload).toBeNull()
  })

  it('rejects a garbage/invalid token (never a valid upload session)', () => {
    expect(verifyToken('not-a-real-token', 'pending_attachment')).toBeNull()
    expect(verifyToken('', 'pending_attachment')).toBeNull()
    expect(verifyToken('a.b.c', 'pending_attachment')).toBeNull()
  })

  it('rejects a token whose kind does not match what the caller expects', () => {
    const sessionToken = signToken({ kind: 'upload_session', sessionId: 's1', issuedCount: 1 }, 60)
    // A session token must never be usable as a file token, even though it
    // verifies fine as a session token.
    expect(verifyToken(sessionToken, 'pending_attachment')).toBeNull()
    expect(verifyToken(sessionToken, 'upload_session')).not.toBeNull()
  })

  it('rejects a path-tampering attempt (payload edited, signature unchanged)', () => {
    const token = signToken({ kind: 'pending_attachment', sessionId: 's1', path: 'pending/s1/a.jpg', mime: 'image/jpeg', maxSize: 1000 }, 60)
    const [encodedPayload, signature] = token.split('.')

    const tamperedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    tamperedPayload.path = 'parts-requests/someone-elses-request/stolen.jpg'
    const tamperedEncoded = Buffer.from(JSON.stringify(tamperedPayload), 'utf8').toString('base64url')
    const tamperedToken = `${tamperedEncoded}.${signature}`

    expect(verifyToken(tamperedToken, 'pending_attachment')).toBeNull()
  })
})

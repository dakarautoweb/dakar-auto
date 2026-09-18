'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ATTACHMENTS_BUCKET, ensurePartsRequestAttachmentsBucket } from './bucket'
import { signToken, verifyToken } from './upload-token'
import { isRateLimited } from './rate-limit'
import { ALLOWED_MIME_TYPES, EXTENSION_BY_MIME, MAX_FILE_SIZE_BYTES, isAttachmentType } from './constants'
import type { RequestUploadUrlInput, RequestUploadUrlResult } from './types'

// Session tokens chain successive requestUploadUrl() calls for the same
// browser "batch" of photos so we can bound how many signed URLs a single
// session can mint, without any server-side session storage. A bit of
// headroom above MAX_FILES (5) is intentional — it covers a user retrying
// a flaky upload without a fresh session — the real 5-attachment ceiling is
// enforced authoritatively in finalize.ts, which hard-slices refs to
// MAX_FILES regardless of how many signed URLs were ever issued.
const MAX_ISSUANCES_PER_SESSION = 8
const SESSION_TOKEN_TTL_SECONDS = 15 * 60
// Must outlive the rest of the wizard (part details -> contact -> review),
// not just the upload step itself, since the token is only spent at submit.
const FILE_TOKEN_TTL_SECONDS = 30 * 60

type SessionTokenPayload = { kind: 'upload_session'; sessionId: string; issuedCount: number; exp: number }
export type FileTokenPayload = { kind: 'pending_attachment'; sessionId: string; path: string; mime: string; maxSize: number; exp: number }

async function getClientKey(): Promise<string> {
  const headerList = await headers()
  const forwardedFor = headerList.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return headerList.get('x-real-ip') ?? 'unknown'
}

export async function requestUploadUrl(input: RequestUploadUrlInput): Promise<RequestUploadUrlResult> {
  const clientKey = await getClientKey()
  if (isRateLimited(`attachment-upload:${clientKey}`)) {
    return { ok: false, error: 'rate_limited' }
  }

  if (!isAttachmentType(input.attachmentType)) {
    return { ok: false, error: 'invalid_type' }
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.declaredMime)) {
    return { ok: false, error: 'invalid_type' }
  }
  if (!(input.declaredSize > 0 && input.declaredSize <= MAX_FILE_SIZE_BYTES)) {
    return { ok: false, error: 'invalid_size' }
  }

  let sessionId: string
  let issuedCount: number
  if (input.sessionToken) {
    const session = verifyToken<SessionTokenPayload>(input.sessionToken, 'upload_session')
    if (!session) return { ok: false, error: 'session_invalid' }
    sessionId = session.sessionId
    issuedCount = session.issuedCount
  } else {
    sessionId = randomUUID()
    issuedCount = 0
  }

  if (issuedCount >= MAX_ISSUANCES_PER_SESSION) {
    return { ok: false, error: 'too_many_files' }
  }

  try {
    await ensurePartsRequestAttachmentsBucket()
  } catch (err) {
    console.error('[attachments] Failed to ensure storage bucket:', err instanceof Error ? err.message : 'Unknown error')
    return { ok: false, error: 'server_error' }
  }

  const ext = EXTENSION_BY_MIME[input.declaredMime] ?? 'bin'
  const storagePath = `pending/${sessionId}/${randomUUID()}.${ext}`

  const { data, error } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).createSignedUploadUrl(storagePath)
  if (error || !data) {
    console.error('[attachments] createSignedUploadUrl failed:', error?.message)
    return { ok: false, error: 'server_error' }
  }

  const fileToken = signToken<Omit<FileTokenPayload, 'exp'>>(
    { kind: 'pending_attachment', sessionId, path: storagePath, mime: input.declaredMime, maxSize: input.declaredSize },
    FILE_TOKEN_TTL_SECONDS
  )
  const sessionToken = signToken<Omit<SessionTokenPayload, 'exp'>>(
    { kind: 'upload_session', sessionId, issuedCount: issuedCount + 1 },
    SESSION_TOKEN_TTL_SECONDS
  )

  return { ok: true, sessionToken, fileToken, storagePath, signedUrl: data.signedUrl }
}

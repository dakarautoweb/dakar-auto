import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ATTACHMENTS_BUCKET } from './bucket'
import { verifyToken } from './upload-token'
import type { FileTokenPayload } from './request-upload-url'
import { sniffImageMime } from './sniff'
import { sanitizeFileName } from './filename'
import { ALLOWED_MIME_TYPES, EXTENSION_BY_MIME, MAX_FILE_SIZE_BYTES, MAX_FILES, isAttachmentType } from './constants'
import type { FinalizedAttachmentResult, PendingAttachmentRef } from './types'

// The trust boundary for the whole direct-upload flow: nothing about a
// pending upload is trusted until this function re-derives it independently
// — the storage path comes only from a verified, server-signed fileToken
// (never from anything the browser claims), and the MIME type comes only
// from sniffing the actual downloaded bytes (never from what was declared
// at issuance time). One bad photo never aborts the loop or the request —
// the parts request itself is already committed by the time this runs (see
// src/services/requests/actions.ts), matching the existing best-effort
// upload semantics this replaces.
export async function finalizePartsRequestAttachments(params: {
  requestId: string
  itemId: string | null
  refs: PendingAttachmentRef[]
}): Promise<FinalizedAttachmentResult[]> {
  // MAX_FILES is the real, authoritative cap — independent of however many
  // signed URLs were issued during the session (see request-upload-url.ts's
  // retry headroom).
  const refs = params.refs.slice(0, MAX_FILES)
  const results: FinalizedAttachmentResult[] = []

  for (const ref of refs) {
    const payload = verifyToken<FileTokenPayload>(ref.fileToken, 'pending_attachment')
    if (!payload) {
      results.push({ clientId: ref.clientId, ok: false, reason: 'expired' })
      continue
    }

    const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).download(payload.path)
    if (downloadError || !blob) {
      results.push({ clientId: ref.clientId, ok: false, reason: 'not_found' })
      continue
    }

    const buffer = Buffer.from(await blob.arrayBuffer())

    if (buffer.length <= 0 || buffer.length > MAX_FILE_SIZE_BYTES) {
      await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([payload.path]).catch(() => {})
      results.push({ clientId: ref.clientId, ok: false, reason: 'too_large' })
      continue
    }

    const sniffedMime = sniffImageMime(buffer)
    if (!sniffedMime || !(ALLOWED_MIME_TYPES as readonly string[]).includes(sniffedMime)) {
      await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([payload.path]).catch(() => {})
      results.push({ clientId: ref.clientId, ok: false, reason: 'invalid_type' })
      continue
    }

    const finalPath = `parts-requests/${params.requestId}/${randomUUID()}.${EXTENSION_BY_MIME[sniffedMime]}`
    const { error: moveError } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).move(payload.path, finalPath)
    if (moveError) {
      console.error('[attachments] Failed to move pending object to final path:', moveError.message)
      await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([payload.path]).catch(() => {})
      results.push({ clientId: ref.clientId, ok: false, reason: 'server_error' })
      continue
    }

    const attachmentType = isAttachmentType(ref.attachmentType) ? ref.attachmentType : 'other'
    const { error: insertError } = await supabaseAdmin.from('request_attachments').insert({
      request_id: params.requestId,
      item_id: params.itemId,
      file_url: finalPath,
      file_type: sniffedMime,
      file_name: sanitizeFileName(ref.originalFileName),
      attachment_type: attachmentType,
    })

    if (insertError) {
      console.error('[attachments] Metadata insert failed, removing orphaned object:', insertError.message)
      await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([finalPath]).catch(() => {})
      results.push({ clientId: ref.clientId, ok: false, reason: 'server_error' })
      continue
    }

    results.push({ clientId: ref.clientId, ok: true })
  }

  return results
}

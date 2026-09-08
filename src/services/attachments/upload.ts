import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ATTACHMENTS_BUCKET, ensurePartsRequestAttachmentsBucket } from './bucket'
import { sniffImageMime } from './sniff'
import { sanitizeFileName } from './filename'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES } from './constants'
import type { AttachmentType, UploadAttachmentsResult } from './types'

type AttachmentInput = {
  file: File
  attachmentType: AttachmentType
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Best-effort, per-file: the parts request itself is already saved before
// this runs, so a failure here must never fail or roll back the request.
// Each file is validated and uploaded independently — one bad file can't
// take down the others.
export async function uploadPartsRequestAttachments(params: {
  requestId: string
  itemId: string | null
  files: AttachmentInput[]
}): Promise<UploadAttachmentsResult> {
  const files = params.files.slice(0, MAX_FILES)
  if (files.length === 0) return { uploaded: 0, failed: 0 }

  try {
    await ensurePartsRequestAttachmentsBucket()
  } catch (err) {
    console.error('[attachments] Failed to ensure storage bucket:', err instanceof Error ? err.message : 'Unknown error')
    return { uploaded: 0, failed: files.length }
  }

  let uploaded = 0
  let failed = 0

  for (const { file, attachmentType } of files) {
    try {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
        failed++
        continue
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const sniffedMime = sniffImageMime(buffer)

      if (!sniffedMime || !(ALLOWED_MIME_TYPES as readonly string[]).includes(sniffedMime)) {
        failed++
        continue
      }

      const storagePath = `parts-requests/${params.requestId}/${randomUUID()}.${EXTENSION_BY_MIME[sniffedMime]}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(storagePath, buffer, { contentType: sniffedMime, upsert: false })

      if (uploadError) {
        console.error('[attachments] Storage upload failed:', uploadError.message)
        failed++
        continue
      }

      const { error: insertError } = await supabaseAdmin.from('request_attachments').insert({
        request_id: params.requestId,
        item_id: params.itemId,
        file_url: storagePath,
        file_type: sniffedMime,
        file_name: sanitizeFileName(file.name),
        attachment_type: attachmentType,
      })

      if (insertError) {
        console.error('[attachments] Metadata insert failed, removing orphaned object:', insertError.message)
        await supabaseAdmin.storage
          .from(ATTACHMENTS_BUCKET)
          .remove([storagePath])
          .catch(() => {})
        failed++
        continue
      }

      uploaded++
    } catch (err) {
      console.error('[attachments] Unexpected error handling upload:', err instanceof Error ? err.message : 'Unknown error')
      failed++
    }
  }

  return { uploaded, failed }
}

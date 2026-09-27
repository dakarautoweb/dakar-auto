import 'server-only'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import { sniffImageMime } from '@/src/services/attachments/sniff'
import type { PartRecognitionErrorCode } from '@/src/lib/part-recognition/types'

export type RecognitionImage = { buffer: Buffer; mime: (typeof ALLOWED_MIME_TYPES)[number] }

export type ImageValidationResult = { ok: true; image: RecognitionImage } | { ok: false; error: PartRecognitionErrorCode }

// Same limits as request-photo uploads (attachments/constants.ts), enforced
// again here: the browser's declared type and size are checked first, then
// the actual bytes are sniffed so a renamed file can't get through.
export async function validateRecognitionImage(value: FormDataEntryValue | null): Promise<ImageValidationResult> {
  if (!value || typeof value === 'string') return { ok: false, error: 'missing_image' }
  if (value.size === 0) return { ok: false, error: 'empty_image' }
  if (value.size > MAX_FILE_SIZE_BYTES) return { ok: false, error: 'too_large' }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(value.type)) return { ok: false, error: 'unsupported_type' }

  const buffer = Buffer.from(await value.arrayBuffer())
  if (buffer.length === 0) return { ok: false, error: 'empty_image' }
  if (buffer.length > MAX_FILE_SIZE_BYTES) return { ok: false, error: 'too_large' }

  const mime = sniffImageMime(buffer)
  if (!mime) return { ok: false, error: 'unsupported_type' }
  return { ok: true, image: { buffer, mime } }
}

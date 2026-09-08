// Pure constants only — safe to import from both server and client code.
// The server is the authority on these limits; the client only uses them
// for immediate UX feedback before a file ever leaves the browser.

import type { AttachmentType } from './types'

export const MAX_FILES = 5
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB

// Content-sniffed MIME types the server will accept. SVG and other
// non-raster/document formats are intentionally excluded.
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const ATTACHMENT_TYPES: AttachmentType[] = ['part_photo', 'vin_photo', 'vehicle_photo', 'other']

export const DEFAULT_ATTACHMENT_TYPE: AttachmentType = 'part_photo'

export function isAttachmentType(value: string): value is AttachmentType {
  return (ATTACHMENT_TYPES as string[]).includes(value)
}

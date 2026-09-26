import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export const INVENTORY_PHOTOS_BUCKET = 'inventory-vehicle-photos'

export const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB
export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PHOTO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

let bucketEnsured = false

// Same idempotent, lazy bucket provisioning as
// src/services/attachments/bucket.ts's ensurePartsRequestAttachmentsBucket
// — except this bucket is public: vehicle photos back the public /vehicles
// pages, so they're served as plain public URLs rather than through
// server-issued signed URLs. Uploads/deletes still only ever happen from
// admin Server Actions (never a client-side signed-upload flow), all
// requireAdmin()-gated before this runs, so the service-role key never
// leaves the server.
export async function ensureInventoryPhotosBucket(): Promise<void> {
  if (bucketEnsured) return

  const { data: existing } = await supabaseAdmin.storage.getBucket(INVENTORY_PHOTOS_BUCKET)
  if (existing) {
    bucketEnsured = true
    return
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(INVENTORY_PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_PHOTO_SIZE_BYTES,
    allowedMimeTypes: [...ALLOWED_PHOTO_MIME_TYPES],
  })

  if (createError && !/already exists/i.test(createError.message)) {
    throw createError
  }

  bucketEnsured = true
}

// Pure string building (matches Supabase Storage's own public-URL shape) —
// safe to call from public queries too since it never makes a network call.
export function inventoryPhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${INVENTORY_PHOTOS_BUCKET}/${storagePath}`
}

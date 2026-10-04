import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export const MATCH_PHOTOS_BUCKET = 'vehicle-request-match-photos'
export const MATCH_PHOTOS_BUCKET_PUBLIC = false
export const MATCH_PHOTO_MAX_BYTES = 8 * 1024 * 1024
export const MATCH_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type MatchPhotoMimeType = (typeof MATCH_PHOTO_MIME_TYPES)[number]
export const MATCH_PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const FOUND_VEHICLE_IMAGE_BUCKETS = new Set([MATCH_PHOTOS_BUCKET, 'inventory-vehicle-photos'])
const MANUAL_MATCH_PHOTO_PATH = /^requests\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGNED_URL_TTL_SECONDS = 60 * 60

export function buildManualMatchPhotoPath(
  requestId: string,
  mime: MatchPhotoMimeType,
  objectId = randomUUID()
): string {
  if (!UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(objectId)) {
    throw new Error('Invalid manual match photo identifier')
  }
  return `requests/${requestId}/${objectId}.${MATCH_PHOTO_EXTENSIONS[mime]}`
}

export function publicStorageImageUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`
}

export async function safeFoundVehicleImageUrl(reference: { bucket: string; path: string } | null): Promise<string | null> {
  if (!reference || !FOUND_VEHICLE_IMAGE_BUCKETS.has(reference.bucket)) return null
  if (
    !reference.path ||
    reference.path.startsWith('/') ||
    reference.path.includes('\\') ||
    reference.path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return null
  }
  if (reference.bucket === MATCH_PHOTOS_BUCKET && !MANUAL_MATCH_PHOTO_PATH.test(reference.path)) return null
  if (reference.bucket !== MATCH_PHOTOS_BUCKET) return publicStorageImageUrl(reference.bucket, reference.path)

  const { data, error } = await supabaseAdmin.storage
    .from(MATCH_PHOTOS_BUCKET)
    .createSignedUrl(reference.path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function resolveFoundVehicleImageUrl(reference: { bucket: string; path: string } | null): Promise<string> {
  const safeImageUrl = await safeFoundVehicleImageUrl(reference)
  if (safeImageUrl) return safeImageUrl

  const base = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/brand/dakar-auto-logo.png`
}

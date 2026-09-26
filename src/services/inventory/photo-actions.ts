'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/services/admin/auth'
import { sniffImageMime } from '@/src/services/attachments/sniff'
import type { InventoryMutationResult } from './actions'
import { ALLOWED_PHOTO_MIME_TYPES, ensureInventoryPhotosBucket, INVENTORY_PHOTOS_BUCKET, MAX_PHOTO_SIZE_BYTES, PHOTO_EXTENSION_BY_MIME } from './storage'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function revalidateVehiclePaths(vehicleId: string) {
  revalidatePath(`/admin/vehicles/${vehicleId}`)
  revalidatePath(`/vehicles/${vehicleId}`)
  revalidatePath('/vehicles')
  revalidatePath('/')
}

// Admin-only, server-proxied upload (the admin's browser sends the raw
// files to this Server Action, already gated by requireAdmin() before any
// storage write happens) rather than the public parts-request flow's
// signed-upload-URL dance in src/services/attachments — that flow exists to
// let an anonymous browser upload directly to Storage without ever trusting
// the client, which is unnecessary here since the caller is already a
// verified admin. The upload is still never trusted blindly: content is
// sniffed by magic bytes (sniffImageMime), not by the browser-declared MIME
// type or file extension.
export async function uploadVehiclePhotosAction(vehicleId: string, formData: FormData): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(vehicleId)) return { ok: false, error: 'invalid_id' }

  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { ok: false, error: 'no_files' }

  const supabase = await createSupabaseServerClient()
  const { data: existing, error: existingError } = await supabase
    .from('inventory_vehicle_photos')
    .select('sort_order, is_primary')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (existingError) {
    console.error('[inventory] Failed to read existing photos before upload:', existingError.message)
    return { ok: false, error: 'server_error' }
  }

  let nextSortOrder = ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1
  // The vehicle already has at least one photo whenever `existing` is
  // non-empty — and the partial unique index guarantees exactly one of
  // those is already flagged primary, so no new upload in this batch
  // should claim that flag.
  let hasPrimary = (existing?.length ?? 0) > 0

  try {
    await ensureInventoryPhotosBucket()
  } catch (err) {
    console.error('[inventory] Failed to ensure photos bucket:', err instanceof Error ? err.message : 'Unknown error')
    return { ok: false, error: 'server_error' }
  }

  let uploadedCount = 0

  for (const file of files) {
    if (file.size > MAX_PHOTO_SIZE_BYTES) continue

    const buffer = Buffer.from(await file.arrayBuffer())
    const mime = sniffImageMime(buffer)
    if (!mime || !(ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(mime)) continue

    const storagePath = `vehicles/${vehicleId}/${randomUUID()}.${PHOTO_EXTENSION_BY_MIME[mime]}`
    const { error: uploadError } = await supabaseAdmin.storage.from(INVENTORY_PHOTOS_BUCKET).upload(storagePath, buffer, { contentType: mime })
    if (uploadError) {
      console.error('[inventory] Photo upload failed:', uploadError.message)
      continue
    }

    const isPrimary = !hasPrimary
    const { error: insertError } = await supabase.from('inventory_vehicle_photos').insert({
      vehicle_id: vehicleId,
      storage_path: storagePath,
      sort_order: nextSortOrder,
      is_primary: isPrimary,
    })

    if (insertError) {
      console.error('[inventory] Photo metadata insert failed, removing orphaned object:', insertError.message)
      await supabaseAdmin.storage.from(INVENTORY_PHOTOS_BUCKET).remove([storagePath]).catch(() => {})
      continue
    }

    nextSortOrder += 1
    hasPrimary = hasPrimary || isPrimary
    uploadedCount += 1
  }

  if (uploadedCount === 0) return { ok: false, error: 'upload_failed' }

  revalidateVehiclePaths(vehicleId)
  return { ok: true }
}

export async function setPrimaryPhotoAction(photoId: string, vehicleId: string): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(photoId) || !UUID_PATTERN.test(vehicleId)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()

  // Two writes, not one atomic statement — Postgres RLS + supabase-js don't
  // give this project a single "unset every other row's flag, set this
  // one's" UPDATE, and the partial unique index (one primary per vehicle)
  // is what actually guarantees correctness here, not statement ordering.
  const { error: clearError } = await supabase.from('inventory_vehicle_photos').update({ is_primary: false }).eq('vehicle_id', vehicleId).eq('is_primary', true)
  if (clearError) {
    console.error('[inventory] Failed to clear previous primary photo:', clearError.message)
    return { ok: false, error: 'update_failed' }
  }

  const { data, error } = await supabase.from('inventory_vehicle_photos').update({ is_primary: true }).eq('id', photoId).select('id').maybeSingle()
  if (error || !data) {
    console.error('[inventory] Failed to set primary photo:', error?.message)
    return { ok: false, error: 'update_failed' }
  }

  revalidateVehiclePaths(vehicleId)
  return { ok: true }
}

export async function deletePhotoAction(photoId: string, vehicleId: string): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(photoId) || !UUID_PATTERN.test(vehicleId)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()
  const { data: photo, error: fetchError } = await supabase
    .from('inventory_vehicle_photos')
    .select('storage_path, is_primary')
    .eq('id', photoId)
    .maybeSingle()

  if (fetchError || !photo) return { ok: false, error: 'not_found' }

  const { error: deleteError } = await supabase.from('inventory_vehicle_photos').delete().eq('id', photoId)
  if (deleteError) {
    console.error('[inventory] Failed to delete photo row:', deleteError.message)
    return { ok: false, error: 'delete_failed' }
  }

  await supabaseAdmin.storage.from(INVENTORY_PHOTOS_BUCKET).remove([(photo as { storage_path: string }).storage_path]).catch(() => {})

  // Promote the next remaining photo to primary so a vehicle with photos
  // never ends up with none flagged primary after its primary is removed.
  if ((photo as { is_primary: boolean }).is_primary) {
    const { data: next } = await supabase.from('inventory_vehicle_photos').select('id').eq('vehicle_id', vehicleId).order('sort_order', { ascending: true }).limit(1).maybeSingle()
    if (next) {
      await supabase.from('inventory_vehicle_photos').update({ is_primary: true }).eq('id', (next as { id: string }).id)
    }
  }

  revalidateVehiclePaths(vehicleId)
  return { ok: true }
}

// Move-up/move-down reordering — same swap-with-neighbor approach as
// src/services/faq/actions.ts's moveFaqItemAction, scoped to one vehicle's
// photos instead of a global list.
export async function moveVehiclePhotoAction(photoId: string, vehicleId: string, direction: 'up' | 'down'): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(photoId) || !UUID_PATTERN.test(vehicleId)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()
  const { data: photos, error } = await supabase.from('inventory_vehicle_photos').select('id, sort_order').eq('vehicle_id', vehicleId).order('sort_order', { ascending: true })

  if (error || !photos) return { ok: false, error: 'update_failed' }

  const index = photos.findIndex((p) => (p as { id: string }).id === photoId)
  if (index === -1) return { ok: false, error: 'not_found' }

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= photos.length) return { ok: true }

  const current = photos[index] as { id: string; sort_order: number }
  const neighbor = photos[swapIndex] as { id: string; sort_order: number }

  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase.from('inventory_vehicle_photos').update({ sort_order: neighbor.sort_order }).eq('id', current.id),
    supabase.from('inventory_vehicle_photos').update({ sort_order: current.sort_order }).eq('id', neighbor.id),
  ])

  if (errorA || errorB) return { ok: false, error: 'update_failed' }

  revalidateVehiclePaths(vehicleId)
  return { ok: true }
}

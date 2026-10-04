'use server'

import { after } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { buildTrackingUrl } from '@/src/lib/contact-info'
import { sniffImageMime } from '@/src/services/attachments/sniff'
import { sendVehicleRequestStatusNotification } from '@/src/services/notifications/send-vehicle-request-status-notification'
import {
  buildManualMatchPhotoPath,
  MATCH_PHOTO_MAX_BYTES,
  MATCH_PHOTO_MIME_TYPES,
  MATCH_PHOTOS_BUCKET,
} from '@/src/services/vehicle-request-matches/storage'
import { requireAdmin } from './auth'
import { isVehicleRequestStatus } from './vehicle-request-statuses'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type UpdateVehicleRequestStatusResult = { ok: true } | { ok: false; error: string }
type UploadedImage = { path: string }

async function uploadManualMatchPhoto(requestId: string, file: File): Promise<UploadedImage | { error: string }> {
  if (file.size > MATCH_PHOTO_MAX_BYTES) return { error: 'photo_too_large' }
  const buffer = Buffer.from(await file.arrayBuffer())
  const mime = sniffImageMime(buffer)
  if (!mime || !(MATCH_PHOTO_MIME_TYPES as readonly string[]).includes(mime)) return { error: 'invalid_photo' }

  const path = buildManualMatchPhotoPath(requestId, mime)
  const { error } = await supabaseAdmin.storage.from(MATCH_PHOTOS_BUCKET).upload(path, buffer, { contentType: mime })
  if (error) return { error: 'photo_upload_failed' }
  return { path }
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export async function updateVehicleRequestStatusAction(
  requestId: string,
  newStatus: string,
  foundVehicleData?: FormData
): Promise<UpdateVehicleRequestStatusResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(requestId)) return { ok: false, error: 'invalid_id' }
  if (!isVehicleRequestStatus(newStatus)) return { ok: false, error: 'invalid_status' }

  const supabase = await createSupabaseServerClient()
  const { data: current, error: currentError } = await supabase
    .from('vehicle_requests')
    .select('status, request_number, customer_name, customer_email, whatsapp_phone, preferred_contact_method, locale, tracking_token')
    .eq('id', requestId)
    .maybeSingle()

  if (currentError || !current) return { ok: false, error: 'not_found' }
  if ((current.status as string) === newStatus) return { ok: false, error: 'no_change' }

  let inventoryVehicleId: string | null = null
  let manualMake: string | null = null
  let manualModel: string | null = null
  let manualYear: number | null = null
  let manualPrice: number | null = null
  let manualCurrency: string | null = null
  let uploadedImage: UploadedImage | null = null

  if (newStatus === 'vehicle_found') {
    if (!foundVehicleData) return { ok: false, error: 'found_vehicle_required' }
    const source = String(foundVehicleData.get('source') ?? '')
    if (source === 'inventory') {
      inventoryVehicleId = String(foundVehicleData.get('inventoryVehicleId') ?? '')
      if (!UUID_PATTERN.test(inventoryVehicleId)) return { ok: false, error: 'invalid_inventory_vehicle' }
    } else if (source === 'manual') {
      manualMake = String(foundVehicleData.get('make') ?? '').trim().slice(0, 120)
      manualModel = String(foundVehicleData.get('model') ?? '').trim().slice(0, 120)
      manualYear = numberOrNull(foundVehicleData.get('year'))
      manualPrice = numberOrNull(foundVehicleData.get('price'))
      manualCurrency = String(foundVehicleData.get('currency') ?? '').trim().toUpperCase().slice(0, 12)
      if (!manualMake || !manualModel || !manualYear || !Number.isInteger(manualYear) || manualYear < 1900 || manualYear > 2100 || !manualCurrency) {
        return { ok: false, error: 'invalid_found_vehicle' }
      }
      if (manualPrice !== null && (!Number.isFinite(manualPrice) || manualPrice < 0)) return { ok: false, error: 'invalid_price' }

      const photo = foundVehicleData.get('photo')
      if (photo instanceof File && photo.size > 0) {
        try {
          const upload = await uploadManualMatchPhoto(requestId, photo)
          if ('error' in upload) return { ok: false, error: upload.error }
          uploadedImage = upload
        } catch (error) {
          console.error('[vehicle-match] Manual photo upload failed:', error instanceof Error ? error.message : 'Unknown error')
          return { ok: false, error: 'photo_upload_failed' }
        }
      }
    } else {
      return { ok: false, error: 'invalid_found_vehicle_source' }
    }
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc('admin_update_vehicle_request_status', {
    p_vehicle_request_id: requestId,
    p_new_status: newStatus,
    p_inventory_vehicle_id: inventoryVehicleId,
    p_manual_make: manualMake,
    p_manual_model: manualModel,
    p_manual_year: manualYear,
    p_manual_price: manualPrice,
    p_manual_currency: manualCurrency,
    p_manual_image_path: uploadedImage?.path ?? null,
  })

  const rpcResult = (rpcRows as { changed: boolean; match_id: string | null }[] | null)?.[0]
  if (rpcError || !rpcResult?.changed) {
    if (uploadedImage) await supabaseAdmin.storage.from(MATCH_PHOTOS_BUCKET).remove([uploadedImage.path]).catch(() => {})
    return { ok: false, error: rpcResult ? 'no_change' : 'update_failed' }
  }

  let foundVehicle: {
    make: string
    model: string
    year: number
    price: number | null
    currency: string
    imageReference: { bucket: string; path: string } | null
  } | undefined

  if (newStatus === 'vehicle_found' && rpcResult.match_id) {
    const { data: match } = await supabase
      .from('vehicle_request_matches')
      .select('make, model, year, price, currency, image_bucket, image_path')
      .eq('id', rpcResult.match_id)
      .maybeSingle()
    if (match) {
      foundVehicle = {
        make: match.make as string,
        model: match.model as string,
        year: match.year as number,
        price: match.price === null ? null : Number(match.price),
        currency: match.currency as string,
        imageReference:
          match.image_bucket && match.image_path
            ? { bucket: match.image_bucket as string, path: match.image_path as string }
            : null,
      }
    }
  }

  const trackingToken = current.tracking_token as string
  after(async () => {
    await sendVehicleRequestStatusNotification({
      requestNumber: current.request_number as string,
      customerName: current.customer_name as string,
      customerEmail: (current.customer_email as string | null) ?? null,
      whatsappPhone: (current.whatsapp_phone as string | null) ?? null,
      preferredContact: current.preferred_contact_method as 'whatsapp' | 'email' | 'phone',
      locale: (current.locale as string) === 'en' ? 'en' : 'fr',
      status: newStatus,
      trackingUrl: buildTrackingUrl(trackingToken),
      trackingToken,
      foundVehicle,
    })
  })

  return { ok: true }
}

export type SaveVehicleRequestNotesResult = { ok: true } | { ok: false; error: string }

export async function saveVehicleRequestNotesAction(requestId: string, notes: string): Promise<SaveVehicleRequestNotesResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(requestId)) return { ok: false, error: 'invalid_id' }
  const supabase = await createSupabaseServerClient()
  const { data: updated, error } = await supabase
    .from('vehicle_requests')
    .update({ admin_notes: notes.slice(0, 5000) || null, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id')
    .maybeSingle()
  if (error || !updated) return { ok: false, error: 'update_failed' }
  return { ok: true }
}

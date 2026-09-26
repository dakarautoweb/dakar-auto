'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/services/admin/auth'
import type { SettingsActionState } from '@/src/services/admin/actions'
import type { PostgrestError } from '@supabase/supabase-js'
import { isVehicleStatus } from './types'
import { INVENTORY_PHOTOS_BUCKET } from './storage'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CURRENT_YEAR = new Date().getFullYear()

function logInventoryError(context: string, error: PostgrestError | null | undefined) {
  if (!error) return
  console.error(`[inventory] ${context}:`, { code: error.code, message: error.message, details: error.details, hint: error.hint })
}

// The admin list, the public catalog, the public detail page, and the
// homepage featured section are all downstream of a write here.
function revalidateInventoryPaths(id?: string) {
  revalidatePath('/admin/vehicles')
  revalidatePath('/vehicles')
  revalidatePath('/')
  if (id) {
    revalidatePath(`/admin/vehicles/${id}`)
    revalidatePath(`/vehicles/${id}`)
  }
}

function parseOptions(raw: FormDataEntryValue | null): string[] {
  const text = String(raw ?? '').trim()
  if (!text) return []
  // One option per line in the textarea — simplest authoring UX for a
  // free-form equipment list, no add/remove-row UI required.
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function readVehicleForm(formData: FormData) {
  const yearRaw = String(formData.get('year') ?? '').trim()
  const mileageRaw = String(formData.get('mileage') ?? '').trim()
  const priceRaw = String(formData.get('price') ?? '').trim()

  return {
    make: String(formData.get('make') ?? '').trim(),
    model: String(formData.get('model') ?? '').trim(),
    year: yearRaw ? Number(yearRaw) : null,
    engineDisplacement: String(formData.get('engineDisplacement') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null,
    mileage: mileageRaw ? Number(mileageRaw) : null,
    descriptionFr: String(formData.get('descriptionFr') ?? '').trim() || null,
    descriptionEn: String(formData.get('descriptionEn') ?? '').trim() || null,
    optionsFr: parseOptions(formData.get('optionsFr')),
    optionsEn: parseOptions(formData.get('optionsEn')),
    price: priceRaw ? Number(priceRaw) : null,
    currency: String(formData.get('currency') ?? 'CAD').trim() || 'CAD',
    transmission: String(formData.get('transmission') ?? '').trim() || null,
    fuelType: String(formData.get('fuelType') ?? '').trim() || null,
    vin: String(formData.get('vin') ?? '').trim() || null,
    status: String(formData.get('status') ?? 'available').trim(),
    isFeatured: formData.get('isFeatured') === 'on',
  }
}

function validateVehicleForm(fields: ReturnType<typeof readVehicleForm>): string | null {
  if (!fields.make) return 'missing_make'
  if (!fields.model) return 'missing_model'
  if (fields.year === null || Number.isNaN(fields.year) || fields.year < 1900 || fields.year > CURRENT_YEAR + 1) return 'invalid_year'
  if (fields.mileage !== null && (Number.isNaN(fields.mileage) || fields.mileage < 0)) return 'invalid_mileage'
  if (fields.price !== null && (Number.isNaN(fields.price) || fields.price < 0)) return 'invalid_price'
  if (!isVehicleStatus(fields.status)) return 'invalid_status'
  return null
}

export type CreateVehicleState = SettingsActionState

export async function createVehicleAction(_prev: CreateVehicleState, formData: FormData): Promise<CreateVehicleState> {
  await requireAdmin()

  const fields = readVehicleForm(formData)
  const validationError = validateVehicleForm(fields)
  if (validationError) return { status: 'error', error: validationError }

  const supabase = await createSupabaseServerClient()
  const { data: created, error } = await supabase
    .from('inventory_vehicles')
    .insert({
      make: fields.make,
      model: fields.model,
      year: fields.year,
      engine_displacement: fields.engineDisplacement,
      color: fields.color,
      mileage: fields.mileage,
      description_fr: fields.descriptionFr,
      description_en: fields.descriptionEn,
      options_fr: fields.optionsFr,
      options_en: fields.optionsEn,
      price: fields.price,
      currency: fields.currency,
      transmission: fields.transmission,
      fuel_type: fields.fuelType,
      vin: fields.vin,
      status: fields.status,
      is_featured: fields.isFeatured,
    })
    .select('id')
    .maybeSingle()

  if (error || !created) {
    logInventoryError('Failed to create vehicle', error)
    return { status: 'error', error: 'save_failed' }
  }

  revalidateInventoryPaths()
  redirect(`/admin/vehicles/${created.id}?created=1`)
}

export type UpdateVehicleState = SettingsActionState

export async function updateVehicleAction(_prev: UpdateVehicleState, formData: FormData): Promise<UpdateVehicleState> {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!UUID_PATTERN.test(id)) return { status: 'error', error: 'invalid_id' }

  const fields = readVehicleForm(formData)
  const validationError = validateVehicleForm(fields)
  if (validationError) return { status: 'error', error: validationError }

  const supabase = await createSupabaseServerClient()
  const { data: updated, error } = await supabase
    .from('inventory_vehicles')
    .update({
      make: fields.make,
      model: fields.model,
      year: fields.year,
      engine_displacement: fields.engineDisplacement,
      color: fields.color,
      mileage: fields.mileage,
      description_fr: fields.descriptionFr,
      description_en: fields.descriptionEn,
      options_fr: fields.optionsFr,
      options_en: fields.optionsEn,
      price: fields.price,
      currency: fields.currency,
      transmission: fields.transmission,
      fuel_type: fields.fuelType,
      vin: fields.vin,
      status: fields.status,
      is_featured: fields.isFeatured,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    logInventoryError('Failed to update vehicle', error)
    return { status: 'error', error: 'save_failed' }
  }

  revalidateInventoryPaths(id)
  return { status: 'success' }
}

export type InventoryMutationResult = { ok: true } | { ok: false; error: string }

export async function deleteVehicleAction(id: string): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()

  // Best-effort cleanup of the vehicle's storage objects before the row (and
  // its photo rows, via on-delete-cascade) disappears — the photo rows are
  // the only record of which storage paths belong to this vehicle.
  const { data: photos } = await supabase.from('inventory_vehicle_photos').select('storage_path').eq('vehicle_id', id)
  if (photos && photos.length > 0) {
    await supabaseAdmin.storage
      .from(INVENTORY_PHOTOS_BUCKET)
      .remove(photos.map((p) => (p as { storage_path: string }).storage_path))
      .catch(() => {})
  }

  const { error } = await supabase.from('inventory_vehicles').delete().eq('id', id)
  if (error) {
    logInventoryError('Failed to delete vehicle', error)
    return { ok: false, error: 'delete_failed' }
  }

  revalidateInventoryPaths(id)
  return { ok: true }
}

export async function setVehicleStatusAction(id: string, status: string): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'invalid_id' }
  if (!isVehicleStatus(status)) return { ok: false, error: 'invalid_status' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('inventory_vehicles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    logInventoryError('Failed to update vehicle status', error)
    return { ok: false, error: 'update_failed' }
  }

  revalidateInventoryPaths(id)
  return { ok: true }
}

export async function setVehicleFeaturedAction(id: string, featured: boolean): Promise<InventoryMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('inventory_vehicles')
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    logInventoryError('Failed to update vehicle featured state', error)
    return { ok: false, error: 'update_failed' }
  }

  revalidateInventoryPaths(id)
  return { ok: true }
}

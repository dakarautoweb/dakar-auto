import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { requireAdmin } from '@/src/services/admin/auth'
import type { Locale } from '@/src/i18n/config'
import { inventoryPhotoUrl } from './storage'
import { PUBLIC_VEHICLE_STATUSES, type AdminVehicle, type PublicVehicleDetail, type PublicVehicleSummary, type VehiclePhoto, type VehicleStatus } from './types'

type PhotoRow = {
  id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
}

type VehicleRow = {
  id: string
  make: string
  model: string
  year: number
  engine_displacement: string | null
  color: string | null
  mileage: number | null
  description_fr: string | null
  description_en: string | null
  options_fr: string[] | null
  options_en: string[] | null
  price: number | null
  currency: string
  transmission: string | null
  fuel_type: string | null
  vin: string | null
  status: VehicleStatus
  is_featured: boolean
  created_at: string
  updated_at: string
  inventory_vehicle_photos?: PhotoRow[] | null
}

const ADMIN_SELECT = '*, inventory_vehicle_photos(id, storage_path, sort_order, is_primary)'

function mapPhotos(rows: PhotoRow[] | null | undefined): VehiclePhoto[] {
  return (rows ?? [])
    .map((row) => ({ id: row.id, url: inventoryPhotoUrl(row.storage_path), sortOrder: row.sort_order, isPrimary: row.is_primary }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function primaryPhotoUrl(photos: VehiclePhoto[]): string | null {
  return (photos.find((p) => p.isPrimary) ?? photos[0])?.url ?? null
}

function mapAdminRow(row: VehicleRow): AdminVehicle {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    engineDisplacement: row.engine_displacement,
    color: row.color,
    mileage: row.mileage,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    optionsFr: row.options_fr ?? [],
    optionsEn: row.options_en ?? [],
    price: row.price,
    currency: row.currency,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    vin: row.vin,
    status: row.status,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: mapPhotos(row.inventory_vehicle_photos),
  }
}

function mapPublicSummary(row: VehicleRow, photos: VehiclePhoto[]): PublicVehicleSummary {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    mileage: row.mileage,
    engineDisplacement: row.engine_displacement,
    transmission: row.transmission,
    color: row.color,
    price: row.price,
    currency: row.currency,
    status: row.status,
    primaryPhotoUrl: primaryPhotoUrl(photos),
  }
}

function logInventoryError(context: string, error: { code?: string; message: string; details?: string; hint?: string } | null | undefined) {
  if (!error) return
  console.error(`[inventory] ${context}:`, { code: error.code, message: error.message, details: error.details, hint: error.hint })
}

// Admin -> Vehicles list: every vehicle regardless of status, newest first.
// Gated by requireAdmin() and, independently, by the "Admins can read all
// vehicles" RLS policy.
export async function getAdminVehicles(): Promise<AdminVehicle[]> {
  await requireAdmin()

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('inventory_vehicles').select(ADMIN_SELECT).order('created_at', { ascending: false })

  if (error) {
    logInventoryError('Failed to load admin vehicle list', error)
    return []
  }

  return ((data ?? []) as VehicleRow[]).map(mapAdminRow)
}

export async function getAdminVehicleById(id: string): Promise<AdminVehicle | null> {
  await requireAdmin()

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('inventory_vehicles').select(ADMIN_SELECT).eq('id', id).maybeSingle()

  if (error) {
    logInventoryError('Failed to load admin vehicle', error)
    return null
  }
  if (!data) return null

  return mapAdminRow(data as VehicleRow)
}

export type PublicVehicleFilters = {
  make?: string
  year?: number
  minPrice?: number
  maxPrice?: number
  status?: 'available' | 'reserved'
}

// Public /vehicles listing. Never throws — a missing table or query failure
// returns an empty list, which the page renders as its own empty state
// (same defensive shape as getPublicFaqItems).
export async function getPublicVehicles(filters: PublicVehicleFilters = {}): Promise<PublicVehicleSummary[]> {
  try {
    const supabase = await createSupabaseServerClient()
    let query = supabase
      .from('inventory_vehicles')
      .select('id, make, model, year, mileage, engine_displacement, transmission, color, price, currency, status, inventory_vehicle_photos(id, storage_path, sort_order, is_primary)')

    query = filters.status ? query.eq('status', filters.status) : query.in('status', PUBLIC_VEHICLE_STATUSES)
    if (filters.make) query = query.eq('make', filters.make)
    if (filters.year) query = query.eq('year', filters.year)
    if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice)
    if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice)

    const { data, error } = await query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })

    if (error) {
      logInventoryError('Failed to load public vehicles', error)
      return []
    }

    return ((data ?? []) as VehicleRow[]).map((row) => mapPublicSummary(row, mapPhotos(row.inventory_vehicle_photos)))
  } catch (err) {
    console.error('[inventory] Failed to load public vehicles:', err instanceof Error ? err.message : 'Unknown error')
    return []
  }
}

// Distinct makes among publicly-visible vehicles, for the /vehicles filter
// dropdown — deduped and sorted in JS rather than a second DB round trip
// per distinct value.
export const getPublicVehicleMakes = cache(async (): Promise<string[]> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('inventory_vehicles').select('make').in('status', PUBLIC_VEHICLE_STATUSES)

    if (error) {
      logInventoryError('Failed to load vehicle makes', error)
      return []
    }

    const makes = new Set((data ?? []).map((row) => (row as { make: string }).make))
    return Array.from(makes).sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.error('[inventory] Failed to load vehicle makes:', err instanceof Error ? err.message : 'Unknown error')
    return []
  }
})

// Homepage "featured vehicles" section — available only (not reserved), so
// nothing already spoken for is promoted on the homepage.
export const getFeaturedVehicles = cache(async (limit = 3): Promise<PublicVehicleSummary[]> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('inventory_vehicles')
      .select('id, make, model, year, mileage, engine_displacement, transmission, color, price, currency, status, inventory_vehicle_photos(id, storage_path, sort_order, is_primary)')
      .eq('status', 'available')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logInventoryError('Failed to load featured vehicles', error)
      return []
    }

    return ((data ?? []) as VehicleRow[]).map((row) => mapPublicSummary(row, mapPhotos(row.inventory_vehicle_photos)))
  } catch (err) {
    console.error('[inventory] Failed to load featured vehicles:', err instanceof Error ? err.message : 'Unknown error')
    return []
  }
})

// Public /vehicles/[id] "related vehicles" strip — always excludes the
// current vehicle and only ever draws from PUBLIC_VEHICLE_STATUSES'
// "available" slice (a reserved vehicle isn't a useful alternative to
// suggest). Same-make-and-model matches rank first, then same-make, then
// everything else, backfilling up to `limit` with zero duplicates since
// each row is fetched once. Returns the same PublicVehicleSummary shape as
// getPublicVehicles so the page can render it through the existing
// VehicleCard with no second card style.
export async function getRelatedVehicles(currentId: string, make: string, model: string, limit = 3): Promise<PublicVehicleSummary[]> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('inventory_vehicles')
      .select('id, make, model, year, mileage, engine_displacement, transmission, color, price, currency, status, inventory_vehicle_photos(id, storage_path, sort_order, is_primary)')
      .eq('status', 'available')
      .neq('id', currentId)
      .order('created_at', { ascending: false })

    if (error) {
      logInventoryError('Failed to load related vehicles', error)
      return []
    }

    const summaries = ((data ?? []) as VehicleRow[]).map((row) => mapPublicSummary(row, mapPhotos(row.inventory_vehicle_photos)))

    const rank = (vehicle: PublicVehicleSummary) => (vehicle.make === make && vehicle.model === model ? 0 : vehicle.make === make ? 1 : 2)
    return [...summaries].sort((a, b) => rank(a) - rank(b)).slice(0, limit)
  } catch (err) {
    console.error('[inventory] Failed to load related vehicles:', err instanceof Error ? err.message : 'Unknown error')
    return []
  }
}

// Public /vehicles/[id] detail — resolved to the caller's locale, and
// returns null both when the row doesn't exist and when it exists but isn't
// publicly visible (status filter below), so the page can render one 404
// path for both instead of leaking which case it was.
export async function getPublicVehicleById(id: string, locale: Locale): Promise<PublicVehicleDetail | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('inventory_vehicles').select(ADMIN_SELECT).eq('id', id).in('status', PUBLIC_VEHICLE_STATUSES).maybeSingle()

    if (error) {
      logInventoryError('Failed to load public vehicle detail', error)
      return null
    }
    if (!data) return null

    const row = data as VehicleRow
    const photos = mapPhotos(row.inventory_vehicle_photos)
    const summary = mapPublicSummary(row, photos)

    return {
      ...summary,
      fuelType: row.fuel_type,
      description: locale === 'en' ? row.description_en : row.description_fr,
      options: (locale === 'en' ? row.options_en : row.options_fr) ?? [],
      photos,
    }
  } catch (err) {
    console.error('[inventory] Failed to load public vehicle detail:', err instanceof Error ? err.message : 'Unknown error')
    return null
  }
}

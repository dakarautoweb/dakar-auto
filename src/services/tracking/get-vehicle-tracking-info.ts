import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { isVehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import type { VehicleTrackingInfo } from './vehicle-types'
import { safeFoundVehicleImageUrl } from '@/src/services/vehicle-request-matches/storage'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public, unauthenticated lookup by tracking_token — the VR- counterpart to
// get-tracking-info.ts. Same trust model: no customer session to apply RLS
// against, so this goes through the service-role client, and the safety
// boundary is entirely the explicit .select() below — admin_notes, id, and
// everything else on vehicle_requests never leaves this function regardless
// of what the row contains. History and the current found-vehicle snapshot
// use separate explicit selects and are mapped into a public DTO that never
// exposes IDs, storage paths, notes or admin identity.
export async function getVehicleTrackingInfo(token: string): Promise<VehicleTrackingInfo | null> {
  if (!UUID_PATTERN.test(token)) return null

  const { data: request, error } = await supabaseAdmin
    .from('vehicle_requests')
    .select(
      `id, request_number, customer_name, created_at, status, preferred_contact_method,
       make, model, year_from, year_to, color, engine, transmission,
       mileage_min, mileage_max, trim_level, budget_min, budget_max, currency, other_preferences`
    )
    .eq('tracking_token', token)
    .maybeSingle()

  if (error) {
    console.error('[tracking] getVehicleTrackingInfo lookup failed:', error.message)
    return null
  }
  if (!request) return null

  const status = request.status as string
  if (!isVehicleRequestStatus(status)) {
    console.error(`[tracking] getVehicleTrackingInfo: request "${request.request_number}" has an unrecognized status "${status}"`)
    return null
  }

  const [{ data: historyRows, error: historyError }, { data: match, error: matchError }] = await Promise.all([
    supabaseAdmin
      .from('vehicle_request_status_history')
      .select('old_status, new_status, created_at')
      .eq('vehicle_request_id', request.id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('vehicle_request_matches')
      .select('make, model, year, price, currency, image_bucket, image_path')
      .eq('vehicle_request_id', request.id)
      .eq('is_current', true)
      .maybeSingle(),
  ])

  if (historyError) console.error('[tracking] getVehicleTrackingInfo history lookup failed:', historyError.message)
  if (matchError) console.error('[tracking] getVehicleTrackingInfo match lookup failed:', matchError.message)

  const statusHistory = (historyRows ?? [])
    .filter((row) => isVehicleRequestStatus(row.new_status as string))
    .map((row) => ({
      oldStatus: row.old_status && isVehicleRequestStatus(row.old_status as string) ? row.old_status : null,
      newStatus: row.new_status,
      createdAt: row.created_at,
    }))

  return {
    requestNumber: request.request_number as string,
    customerName: request.customer_name as string,
    createdAt: request.created_at as string,
    status,
    vehicle: {
      make: (request.make as string | null) ?? null,
      model: (request.model as string | null) ?? null,
      yearFrom: (request.year_from as number | null) ?? null,
      yearTo: (request.year_to as number | null) ?? null,
      color: (request.color as string | null) ?? null,
      engine: (request.engine as string | null) ?? null,
      transmission: (request.transmission as string | null) ?? null,
      mileageMin: (request.mileage_min as number | null) ?? null,
      mileageMax: (request.mileage_max as number | null) ?? null,
      trimLevel: (request.trim_level as string | null) ?? null,
      budgetMin: (request.budget_min as number | null) ?? null,
      budgetMax: (request.budget_max as number | null) ?? null,
      currency: (request.currency as string | null) ?? 'XOF',
      otherPreferences: (request.other_preferences as string | null) ?? null,
    },
    preferredContactMethod: request.preferred_contact_method as string,
    statusHistory,
    foundVehicle: match
      ? {
          make: match.make as string,
          model: match.model as string,
          year: match.year as number,
          price: match.price === null ? null : Number(match.price),
          currency: match.currency as string,
          imageUrl: await safeFoundVehicleImageUrl(
            match.image_bucket && match.image_path
              ? { bucket: match.image_bucket as string, path: match.image_path as string }
              : null
          ),
        }
      : null,
  }
}

import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { isVehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import type { VehicleTrackingInfo } from './vehicle-types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public, unauthenticated lookup by tracking_token — the VR- counterpart to
// get-tracking-info.ts. Same trust model: no customer session to apply RLS
// against, so this goes through the service-role client, and the safety
// boundary is entirely the explicit .select() below — admin_notes, id, and
// everything else on vehicle_requests never leaves this function regardless
// of what the row contains. There is no status-history table for vehicle
// requests (see admin/vehicle-request-actions.ts), so unlike
// getTrackingInfo this never queries one — VehicleTrackingInfo has no
// statusHistory field to populate.
export async function getVehicleTrackingInfo(token: string): Promise<VehicleTrackingInfo | null> {
  if (!UUID_PATTERN.test(token)) return null

  const { data: request, error } = await supabaseAdmin
    .from('vehicle_requests')
    .select(
      `request_number, created_at, status, preferred_contact_method,
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

  return {
    requestNumber: request.request_number as string,
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
  }
}

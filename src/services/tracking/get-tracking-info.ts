import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { isRequestStatus, type RequestStatus } from '@/src/services/admin/statuses'
import type { TrackingInfo, TrackingItem, TrackingStatusEvent } from './types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public, unauthenticated lookup by tracking_token — there is no customer
// session to apply RLS against, so this deliberately goes through the
// service-role client (same as the admin-side queries) rather than
// relying on a public anon-key policy. The safety boundary is entirely
// here: only the fields assembled into TrackingInfo ever leave this
// function, regardless of what the underlying rows contain (admin_notes,
// changed_by, storage paths, vin_api_data, etc. are never selected, let
// alone returned).
export async function getTrackingInfo(token: string): Promise<TrackingInfo | null> {
  if (!UUID_PATTERN.test(token)) return null

  const { data: request, error } = await supabaseAdmin
    .from('parts_requests')
    .select(
      `id, request_number, created_at, status, preferred_contact_method,
       vehicles(year, make, model),
       parts_request_items(category, part_name, quantity, condition_preference, description)`
    )
    .eq('tracking_token', token)
    .maybeSingle()

  if (error) {
    console.error('[tracking] getTrackingInfo lookup failed:', error.message)
    return null
  }
  if (!request) return null

  const status = request.status as string
  if (!isRequestStatus(status)) {
    console.error(`[tracking] getTrackingInfo: request ${request.id} has an unrecognized status "${status}"`)
    return null
  }

  const { data: historyRows, error: historyError } = await supabaseAdmin
    .from('request_status_history')
    .select('old_status, new_status, created_at')
    .eq('request_id', request.id)
    .order('created_at', { ascending: true })

  if (historyError) {
    console.error('[tracking] getTrackingInfo history lookup failed:', historyError.message)
  }

  const statusHistory: TrackingStatusEvent[] = (historyRows ?? [])
    .filter((row): row is { old_status: string | null; new_status: string; created_at: string } => isRequestStatus(row.new_status))
    .map((row) => ({
      oldStatus: row.old_status && isRequestStatus(row.old_status) ? (row.old_status as RequestStatus) : null,
      newStatus: row.new_status as RequestStatus,
      createdAt: row.created_at,
    }))

  const vehicleRow = Array.isArray(request.vehicles) ? request.vehicles[0] : request.vehicles
  const items: TrackingItem[] = (request.parts_request_items ?? []).map((item) => ({
    category: item.category as string,
    partName: item.part_name as string,
    quantity: item.quantity as number,
    conditionPreference: item.condition_preference as string,
    description: (item.description as string | null) ?? null,
  }))

  return {
    requestNumber: request.request_number as string,
    createdAt: request.created_at as string,
    status,
    vehicle: vehicleRow ? { year: (vehicleRow.year as number | null) ?? null, make: vehicleRow.make as string, model: vehicleRow.model as string } : null,
    items,
    preferredContactMethod: request.preferred_contact_method as string,
    statusHistory,
  }
}

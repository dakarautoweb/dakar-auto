// Pure types only — safe to import from both server and client code.
//
// This is the ENTIRE public surface a customer can see for a vehicle
// sourcing request via /track/[token] — the VR- counterpart to
// tracking/types.ts's TrackingInfo. Deliberately a flat, explicit DTO, not
// a passthrough of any DB row: no internal IDs, no admin_notes, no
// changed_by/admin identity. There is also, deliberately, no
// statusHistory field at all — vehicle_requests has no status-history
// table (see src/services/admin/vehicle-request-actions.ts), so this type
// never implies one exists. Anything not listed here must never be added
// without re-checking against this list.
import type { VehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'

export type VehicleTrackingInfo = {
  requestNumber: string
  createdAt: string
  status: VehicleRequestStatus
  vehicle: {
    make: string | null
    model: string | null
    yearFrom: number | null
    yearTo: number | null
    color: string | null
    engine: string | null
    transmission: string | null
    mileageMin: number | null
    mileageMax: number | null
    trimLevel: string | null
    budgetMin: number | null
    budgetMax: number | null
    currency: string
    otherPreferences: string | null
  }
  preferredContactMethod: string
}

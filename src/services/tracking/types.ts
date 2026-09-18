// Pure types only — safe to import from both server and client code.
//
// This is the ENTIRE public surface a customer can see via /track/[token].
// Deliberately a flat, explicit DTO (not a passthrough of any DB row) —
// no internal IDs, no admin_notes, no changed_by/admin identity, no
// storage paths, no vin_api_data/identification metadata. Anything not
// listed here must never be added without re-checking against that list.
import type { RequestStatus } from '@/src/services/admin/statuses'

export type TrackingStatusEvent = {
  oldStatus: RequestStatus | null
  newStatus: RequestStatus
  createdAt: string
}

export type TrackingItem = {
  category: string
  partName: string
  quantity: number
  conditionPreference: string
  description: string | null
}

export type TrackingInfo = {
  requestNumber: string
  createdAt: string
  status: RequestStatus
  vehicle: {
    year: number | null
    make: string
    model: string
  } | null
  items: TrackingItem[]
  preferredContactMethod: string
  statusHistory: TrackingStatusEvent[]
}

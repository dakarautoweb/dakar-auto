// Pure types/constants — safe to import from both server and client code.

export const VEHICLE_REQUEST_STATUSES = [
  'request_received',
  'on_treatment',
  'vehicle_found',
  'direct_communication',
  'closed',
  'cancelled',
] as const

export type VehicleRequestStatus = (typeof VEHICLE_REQUEST_STATUSES)[number]

export function isVehicleRequestStatus(value: string): value is VehicleRequestStatus {
  return (VEHICLE_REQUEST_STATUSES as readonly string[]).includes(value)
}

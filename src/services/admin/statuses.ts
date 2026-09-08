// Pure types/constants — safe to import from both server and client code.

export const REQUEST_STATUSES = [
  'request_received',
  'on_treatment',
  'parts_found',
  'direct_communication',
  'closed',
  'cancelled',
] as const

export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value)
}

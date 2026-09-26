// Same payloads the email templates already consume — one shape per request
// type for every channel (admin email, customer email, WhatsApp).
export type { PartsRequestEmailData as PartsRequestNotificationData } from '@/src/services/email/types'
export type { VehicleRequestEmailData as VehicleRequestNotificationData } from '@/src/services/email/vehicle-request-types'

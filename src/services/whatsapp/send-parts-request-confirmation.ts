import 'server-only'
import type { PartsRequestNotificationData } from '@/src/services/notifications/types'
import { sendWhatsAppCustomerConfirmation } from './send-customer-confirmation'
import type { WhatsAppSendResult } from './send-template'

export function buildVehicleSummary(vehicle: PartsRequestNotificationData['vehicle']): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
}

// Template body parameter order — must match the approved Meta template
// (see docs/whatsapp-cloud-api.md):
//   {{1}} customer name
//   {{2}} request number (the final DA-YYYY-NNNNNN stored value, verbatim)
//   {{3}} vehicle summary
//   {{4}} tracking URL
export function buildPartsRequestConfirmationParameters(data: PartsRequestNotificationData): string[] {
  return [data.contact.name, data.requestNumber, buildVehicleSummary(data.vehicle), data.trackingUrl]
}

// Customer confirmation over WhatsApp. Best-effort and never throws —
// missing configuration or an unusable number is a logged no-op.
export async function sendPartsRequestWhatsAppConfirmation(data: PartsRequestNotificationData): Promise<WhatsAppSendResult> {
  return sendWhatsAppCustomerConfirmation({
    templateSet: 'parts_request',
    requestNumber: data.requestNumber,
    locale: data.locale,
    whatsappPhone: data.contact.whatsappPhone,
    bodyParameters: buildPartsRequestConfirmationParameters(data),
  })
}

import 'server-only'
import { yearRangeLine } from '@/src/services/email/templates/vehicle-request-format'
import type { VehicleRequestNotificationData } from '@/src/services/notifications/types'
import { sendWhatsAppCustomerConfirmation } from './send-customer-confirmation'
import type { WhatsAppSendResult } from './send-template'

// Compact "make model years" line, e.g. "Toyota RAV4 2018–2021". Reuses the
// year-range formatting the vehicle-request emails already use. An empty
// result is sent as "—" by sanitizeTemplateText.
export function buildWantedVehicleSummary(vehicle: VehicleRequestNotificationData['vehicle']): string {
  return [vehicle.make.trim(), vehicle.model.trim(), yearRangeLine(vehicle)].filter(Boolean).join(' ')
}

// Template body parameter order — must match the approved Meta vehicle
// template (see docs/whatsapp-cloud-api.md):
//   {{1}} customer name
//   {{2}} request number (the final VR-YYYY-NNNNNN stored value, verbatim)
//   {{3}} wanted vehicle summary
//   {{4}} tracking URL
export function buildVehicleRequestConfirmationParameters(data: VehicleRequestNotificationData): string[] {
  return [data.contact.name, data.requestNumber, buildWantedVehicleSummary(data.vehicle), data.trackingUrl]
}

// Customer confirmation over WhatsApp. Best-effort and never throws —
// missing configuration or an unusable number is a logged no-op.
export async function sendVehicleRequestWhatsAppConfirmation(data: VehicleRequestNotificationData): Promise<WhatsAppSendResult> {
  return sendWhatsAppCustomerConfirmation({
    templateSet: 'vehicle_request',
    requestNumber: data.requestNumber,
    locale: data.locale,
    whatsappPhone: data.contact.whatsappPhone,
    bodyParameters: buildVehicleRequestConfirmationParameters(data),
  })
}

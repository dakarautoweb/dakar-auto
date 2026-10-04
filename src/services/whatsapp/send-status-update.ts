import 'server-only'
import type { Locale } from '@/src/i18n/config'
import type { RequestStatus } from '@/src/services/admin/statuses'
import type { VehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import { sendWhatsAppCustomerConfirmation } from './send-customer-confirmation'
import { getWhatsAppStatusCopy } from './status-copy'
import type { WhatsAppSendResult } from './send-template'

export type WhatsAppStatusUpdateData = {
  customerName: string
  requestNumber: string
  status: RequestStatus | VehicleRequestStatus
  trackingUrl: string
  locale: Locale
  whatsappPhone: string | null
}

export function buildStatusUpdateParameters(data: WhatsAppStatusUpdateData): string[] {
  const copy = getWhatsAppStatusCopy(data.locale, data.status)
  return [data.customerName, data.requestNumber, copy.label, copy.message, data.trackingUrl]
}

export async function sendWhatsAppStatusUpdate(data: WhatsAppStatusUpdateData): Promise<WhatsAppSendResult> {
  return sendWhatsAppCustomerConfirmation({
    templateSet: 'status',
    requestNumber: data.requestNumber,
    locale: data.locale,
    whatsappPhone: data.whatsappPhone,
    bodyParameters: buildStatusUpdateParameters(data),
  })
}

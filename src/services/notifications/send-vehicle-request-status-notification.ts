import 'server-only'
import type { Locale } from '@/src/i18n/config'
import type { PreferredContact } from '@/src/services/requests/types'
import type { VehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import { sendVehicleRequestStatusUpdateEmail } from '@/src/services/email'
import { sendWhatsAppStatusUpdate } from '@/src/services/whatsapp/send-status-update'
import { sendVehicleFoundWhatsApp, type FoundVehicleWhatsAppData } from '@/src/services/whatsapp/send-vehicle-found'
import { runDeliveries, type Delivery } from './run-deliveries'

export type VehicleStatusNotificationData = {
  requestNumber: string
  customerName: string
  customerEmail: string | null
  whatsappPhone: string | null
  preferredContact: PreferredContact
  locale: Locale
  status: VehicleRequestStatus
  trackingUrl: string
  trackingToken: string
  foundVehicle?: FoundVehicleWhatsAppData['vehicle']
}

export async function sendVehicleRequestStatusNotification(data: VehicleStatusNotificationData): Promise<void> {
  const deliveries: Delivery[] = []
  if (data.preferredContact === 'whatsapp') {
    if (data.status === 'vehicle_found') {
      if (!data.foundVehicle) {
        console.error(`[notifications] customer WhatsApp vehicle found for ${data.requestNumber} skipped: match snapshot unavailable`)
        return
      }
      deliveries.push({
        label: 'customer WhatsApp vehicle found',
        run: () =>
          sendVehicleFoundWhatsApp({
            customerName: data.customerName,
            requestNumber: data.requestNumber,
            trackingToken: data.trackingToken,
            locale: data.locale,
            whatsappPhone: data.whatsappPhone,
            vehicle: data.foundVehicle!,
          }),
      })
    } else {
      deliveries.push({ label: 'customer WhatsApp status', run: () => sendWhatsAppStatusUpdate(data) })
    }
  } else if (data.preferredContact === 'email') {
    deliveries.push({
      label: 'customer email status',
      run: () =>
        sendVehicleRequestStatusUpdateEmail(
          {
            requestNumber: data.requestNumber,
            trackingUrl: data.trackingUrl,
            locale: data.locale,
            status: data.status,
            customerName: data.customerName,
          },
          data.customerEmail
        ),
    })
  }
  await runDeliveries(data.requestNumber, deliveries)
}

import 'server-only'
import type { Locale } from '@/src/i18n/config'
import type { PreferredContact } from '@/src/services/requests/types'
import type { RequestStatus } from '@/src/services/admin/statuses'
import { sendStatusUpdateEmail } from '@/src/services/email'
import { sendWhatsAppStatusUpdate } from '@/src/services/whatsapp/send-status-update'
import { runDeliveries, type Delivery } from './run-deliveries'

export type PartsStatusNotificationData = {
  requestNumber: string
  customerName: string
  customerEmail: string | null
  whatsappPhone: string | null
  preferredContact: PreferredContact
  locale: Locale
  status: RequestStatus
  trackingUrl: string
}

export async function sendPartsStatusNotification(data: PartsStatusNotificationData): Promise<void> {
  const deliveries: Delivery[] = []
  if (data.preferredContact === 'whatsapp') {
    deliveries.push({ label: 'customer WhatsApp status', run: () => sendWhatsAppStatusUpdate(data) })
  } else if (data.preferredContact === 'email') {
    deliveries.push({
      label: 'customer email status',
      run: () =>
        sendStatusUpdateEmail(
          { requestNumber: data.requestNumber, locale: data.locale, status: data.status, customerName: data.customerName },
          data.customerEmail
        ),
    })
  }
  await runDeliveries(data.requestNumber, deliveries)
}

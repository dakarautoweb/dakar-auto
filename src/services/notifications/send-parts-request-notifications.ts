import 'server-only'
import { sendPartsRequestAdminEmail, sendPartsRequestCustomerEmail } from '@/src/services/email'
import { sendPartsRequestWhatsAppConfirmation } from '@/src/services/whatsapp/send-parts-request-confirmation'
import { runDeliveries, type Delivery } from './run-deliveries'
import type { PartsRequestNotificationData } from './types'

// Routes the post-submission notifications for a saved parts request:
//
// - admin email: always (when Resend + DAKAR_ADMIN_EMAIL are configured)
// - customer confirmation: only on the channel the customer chose
//     whatsapp → WhatsApp template, never email
//     email    → confirmation email, never WhatsApp
//     phone    → nothing automatic; the team calls the customer
//
// There is deliberately no fallback between channels: a failed WhatsApp
// send does not turn into an email. The request row is the source of truth
// either way. This function never throws (see runDeliveries).
export async function sendPartsRequestNotifications(data: PartsRequestNotificationData): Promise<void> {
  const deliveries: Delivery[] = [{ label: 'admin email', run: () => sendPartsRequestAdminEmail(data) }]

  switch (data.contact.preferredContact) {
    case 'whatsapp':
      deliveries.push({ label: 'customer WhatsApp', run: () => sendPartsRequestWhatsAppConfirmation(data) })
      break
    case 'email':
      deliveries.push({ label: 'customer email', run: () => sendPartsRequestCustomerEmail(data) })
      break
    case 'phone':
      break
  }

  await runDeliveries(data.requestNumber, deliveries)
}

import 'server-only'
import { sendVehicleRequestAdminEmail, sendVehicleRequestCustomerEmail } from '@/src/services/email'
import { sendVehicleRequestWhatsAppConfirmation } from '@/src/services/whatsapp/send-vehicle-request-confirmation'
import { runDeliveries, type Delivery } from './run-deliveries'
import type { VehicleRequestNotificationData } from './types'

// Routes the post-submission notifications for a saved vehicle sourcing
// request — same rules as sendPartsRequestNotifications:
//
// - admin email: always (when Resend + DAKAR_ADMIN_EMAIL are configured)
// - customer confirmation: only on the channel the customer chose
//     whatsapp → WhatsApp vehicle template, never email
//     email    → confirmation email, never WhatsApp
//     phone    → nothing automatic; the team calls the customer
//
// No fallback between channels, and this function never throws.
export async function sendVehicleRequestNotifications(data: VehicleRequestNotificationData): Promise<void> {
  const deliveries: Delivery[] = [{ label: 'admin email', run: () => sendVehicleRequestAdminEmail(data) }]

  switch (data.contact.preferredContact) {
    case 'whatsapp':
      deliveries.push({ label: 'customer WhatsApp', run: () => sendVehicleRequestWhatsAppConfirmation(data) })
      break
    case 'email':
      deliveries.push({ label: 'customer email', run: () => sendVehicleRequestCustomerEmail(data) })
      break
    case 'phone':
      break
  }

  await runDeliveries(data.requestNumber, deliveries)
}

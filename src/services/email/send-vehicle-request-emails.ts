import 'server-only'
import { resendClient, EMAIL_FROM, ADMIN_EMAIL } from './config'
import { buildVehicleRequestCustomerConfirmationEmail } from './templates/vehicle-request-customer-confirmation'
import { buildVehicleRequestAdminNotificationEmail } from './templates/vehicle-request-admin-notification'
import type { VehicleRequestEmailData } from './vehicle-request-types'

function safeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

// Best-effort only, same contract as the parts-request emails: the database
// row is already committed before these run, and neither function throws.
// Deciding *whether* to send the customer email (the customer's preferred
// contact method) is the notification orchestrator's job, not this
// module's; see src/services/notifications/send-vehicle-request-notifications.ts.

export async function sendVehicleRequestCustomerEmail(data: VehicleRequestEmailData): Promise<void> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping vehicle request customer confirmation')
    return
  }
  if (!data.contact.email) {
    console.error('[email] No customer email address — skipping vehicle request customer confirmation')
    return
  }

  const { subject, html } = buildVehicleRequestCustomerConfirmationEmail(data)
  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to: data.contact.email, subject, html })
    if (error) console.error('[email] Vehicle request customer confirmation send failed:', error.message)
  } catch (err) {
    console.error('[email] Vehicle request customer confirmation send threw:', safeErrorMessage(err))
  }
}

export async function sendVehicleRequestAdminEmail(data: VehicleRequestEmailData): Promise<void> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping vehicle request admin notification')
    return
  }
  if (!ADMIN_EMAIL) {
    console.error('[email] DAKAR_ADMIN_EMAIL is not configured — skipping vehicle request admin notification')
    return
  }

  const { subject, html } = buildVehicleRequestAdminNotificationEmail(data)
  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to: ADMIN_EMAIL, subject, html })
    if (error) console.error('[email] Vehicle request admin notification send failed:', error.message)
  } catch (err) {
    console.error('[email] Vehicle request admin notification send threw:', safeErrorMessage(err))
  }
}

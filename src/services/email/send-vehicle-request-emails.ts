import 'server-only'
import { resendClient, EMAIL_FROM, ADMIN_EMAIL } from './config'
import { buildVehicleRequestCustomerConfirmationEmail } from './templates/vehicle-request-customer-confirmation'
import { buildVehicleRequestAdminNotificationEmail } from './templates/vehicle-request-admin-notification'
import type { VehicleRequestEmailData } from './vehicle-request-types'

function safeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

// Best-effort only, same contract as sendPartsRequestEmails: the database
// row is already committed before this runs, and a failure here must never
// affect the caller. Every send is individually caught.
export async function sendVehicleRequestEmails(data: VehicleRequestEmailData): Promise<void> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping vehicle request emails')
    return
  }

  const sends: Promise<void>[] = []

  if (data.contact.email) {
    const { subject, html } = buildVehicleRequestCustomerConfirmationEmail(data)
    sends.push(
      resendClient.emails
        .send({ from: EMAIL_FROM, to: data.contact.email, subject, html })
        .then(({ error }) => {
          if (error) console.error('[email] Vehicle request customer confirmation send failed:', error.message)
        })
        .catch((err) => console.error('[email] Vehicle request customer confirmation send threw:', safeErrorMessage(err)))
    )
  }

  if (ADMIN_EMAIL) {
    const { subject, html } = buildVehicleRequestAdminNotificationEmail(data)
    sends.push(
      resendClient.emails
        .send({ from: EMAIL_FROM, to: ADMIN_EMAIL, subject, html })
        .then(({ error }) => {
          if (error) console.error('[email] Vehicle request admin notification send failed:', error.message)
        })
        .catch((err) => console.error('[email] Vehicle request admin notification send threw:', safeErrorMessage(err)))
    )
  } else {
    console.error('[email] DAKAR_ADMIN_EMAIL is not configured — skipping vehicle request admin notification')
  }

  await Promise.allSettled(sends)
}

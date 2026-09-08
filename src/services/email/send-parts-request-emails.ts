import 'server-only'
import { resendClient, EMAIL_FROM, ADMIN_EMAIL } from './config'
import { buildCustomerConfirmationEmail } from './templates/customer-confirmation'
import { buildAdminNotificationEmail } from './templates/admin-notification'
import type { PartsRequestEmailData } from './types'

// Never include the error object itself in logs — it may carry request
// payloads (including the Resend API key on some failure paths).
function safeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

// Best-effort only: the database row is the source of truth for a parts
// request. A Resend failure here must never affect the caller — every send
// is individually caught so one failure can't suppress the other, and this
// function itself never throws.
export async function sendPartsRequestEmails(data: PartsRequestEmailData): Promise<void> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping parts request emails')
    return
  }

  const sends: Promise<void>[] = []

  if (data.contact.email) {
    const { subject, html } = buildCustomerConfirmationEmail(data)
    sends.push(
      resendClient.emails
        .send({ from: EMAIL_FROM, to: data.contact.email, subject, html })
        .then(({ error }) => {
          if (error) console.error('[email] Customer confirmation send failed:', error.message)
        })
        .catch((err) => console.error('[email] Customer confirmation send threw:', safeErrorMessage(err)))
    )
  }

  if (ADMIN_EMAIL) {
    const { subject, html } = buildAdminNotificationEmail(data)
    sends.push(
      resendClient.emails
        .send({ from: EMAIL_FROM, to: ADMIN_EMAIL, subject, html })
        .then(({ error }) => {
          if (error) console.error('[email] Admin notification send failed:', error.message)
        })
        .catch((err) => console.error('[email] Admin notification send threw:', safeErrorMessage(err)))
    )
  } else {
    console.error('[email] DAKAR_ADMIN_EMAIL is not configured — skipping admin notification')
  }

  await Promise.allSettled(sends)
}

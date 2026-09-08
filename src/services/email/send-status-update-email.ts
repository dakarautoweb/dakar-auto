import 'server-only'
import { resendClient, EMAIL_FROM } from './config'
import { buildStatusUpdateEmail, type StatusUpdateEmailData } from './templates/status-update'

// Best-effort only, same contract as sendPartsRequestEmails: the database
// status change is already committed before this runs, and a failure here
// must never be treated as the status update having failed.
export async function sendStatusUpdateEmail(data: StatusUpdateEmailData, customerEmail: string | null): Promise<void> {
  if (!customerEmail) return

  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping status update email')
    return
  }

  const { subject, html } = buildStatusUpdateEmail(data)

  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to: customerEmail, subject, html })
    if (error) console.error('[email] Status update send failed:', error.message)
  } catch (err) {
    console.error('[email] Status update send threw:', err instanceof Error ? err.message : 'Unknown error')
  }
}

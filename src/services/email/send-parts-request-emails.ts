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
// request. Neither function throws — a Resend failure is logged and
// swallowed. Deciding *whether* to send (the customer's preferred contact
// method) is the notification orchestrator's job, not this module's; see
// src/services/notifications/send-parts-request-notifications.ts.

export async function sendPartsRequestCustomerEmail(data: PartsRequestEmailData): Promise<void> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping customer confirmation')
    return
  }
  if (!data.contact.email) {
    console.error('[email] No customer email address — skipping customer confirmation')
    return
  }

  const { subject, html } = buildCustomerConfirmationEmail(data)
  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to: data.contact.email, subject, html })
    if (error) console.error('[email] Customer confirmation send failed:', error.message)
  } catch (err) {
    console.error('[email] Customer confirmation send threw:', safeErrorMessage(err))
  }
}

export async function sendPartsRequestAdminEmail(data: PartsRequestEmailData): Promise<void> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping admin notification')
    return
  }
  if (!ADMIN_EMAIL) {
    console.error('[email] DAKAR_ADMIN_EMAIL is not configured — skipping admin notification')
    return
  }

  const { subject, html } = buildAdminNotificationEmail(data)
  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to: ADMIN_EMAIL, subject, html })
    if (error) console.error('[email] Admin notification send failed:', error.message)
  } catch (err) {
    console.error('[email] Admin notification send threw:', safeErrorMessage(err))
  }
}

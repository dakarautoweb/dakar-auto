import 'server-only'
import { resendClient, EMAIL_FROM } from './config'
import { buildRequestRecoveryCodeEmail, type RequestRecoveryCodeEmailData } from './templates/request-recovery-code'

// Unlike the best-effort notification emails, the caller needs to know
// whether this was handed to Resend: an undelivered code is invalidated
// and the customer told to try again. Never logs the code or the address.
export async function sendRequestRecoveryCodeEmail(to: string, data: RequestRecoveryCodeEmailData): Promise<boolean> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — cannot send recovery code')
    return false
  }

  const { subject, html } = buildRequestRecoveryCodeEmail(data)
  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to, subject, html })
    if (error) {
      console.error('[email] Recovery code send failed:', error.name)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Recovery code send threw:', err instanceof Error ? err.name : 'Unknown error')
    return false
  }
}

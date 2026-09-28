import 'server-only'
import { resendClient, EMAIL_FROM, EMAIL_FROM_USES_FALLBACK } from './config'
import { buildRequestRecoveryCodeEmail, type RequestRecoveryCodeEmailData } from './templates/request-recovery-code'

// Unlike the best-effort notification emails, the caller needs to know
// whether this was handed to Resend: an undelivered code is invalidated
// and the customer told to try again. Never logs the code or the address —
// nor Resend's message text, which can quote the recipient. Resend's error
// name + HTTP status is enough to tell a bad key, an unverified sender
// (the onboarding@resend.dev fallback rejects other recipients) and a quota
// apart.
export async function sendRequestRecoveryCodeEmail(to: string, data: RequestRecoveryCodeEmailData): Promise<boolean> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — cannot send recovery code')
    return false
  }

  const { subject, html } = buildRequestRecoveryCodeEmail(data)
  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to, subject, html })
    if (error) {
      console.error(
        '[email] Recovery code send rejected by Resend:',
        `name=${error.name} status=${error.statusCode ?? 'none'} fallbackSender=${EMAIL_FROM_USES_FALLBACK}`,
      )
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Recovery code send threw:', err instanceof Error ? err.name : 'Unknown error')
    return false
  }
}

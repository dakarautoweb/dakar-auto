import 'server-only'
import { resendClient, EMAIL_FROM } from './config'
import { buildAdminReportEmail } from './templates/admin-report'

export type SendTableReportResult = { ok: true } | { ok: false; error: 'not_configured' | 'send_failed' }

// Unlike sendStatusUpdateEmail/sendPartsRequestAdminEmail (both best-effort,
// customer-facing, never surfaced as a failure to anyone), this is an
// explicit admin action with its own "Sending..."/success/error UI (see
// send-report-modal.tsx) — a real ok/error result, not a silent no-op.
export async function sendTableReportEmail(opts: {
  to: string
  subject: string
  message: string
  csv: string
  filename: string
}): Promise<SendTableReportResult> {
  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — cannot send admin report email')
    return { ok: false, error: 'not_configured' }
  }

  const { html } = buildAdminReportEmail({ subject: opts.subject, message: opts.message, filename: opts.filename })

  try {
    const { error } = await resendClient.emails.send({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html,
      attachments: [{ filename: opts.filename, content: Buffer.from(opts.csv, 'utf-8'), contentType: 'text/csv' }],
    })
    if (error) {
      console.error('[email] Admin report send failed:', error.message)
      return { ok: false, error: 'send_failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] Admin report send threw:', err instanceof Error ? err.message : 'Unknown error')
    return { ok: false, error: 'send_failed' }
  }
}

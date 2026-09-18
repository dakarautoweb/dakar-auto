import 'server-only'
import { escapeHtml, renderEmailShell, renderParagraph } from '../layout'

// Internal admin-to-admin utility email (Export/Share -> "Send by email" on
// an admin table) — deliberately plain compared to the customer-facing
// templates in this folder: no CTA button, no branded info card, just the
// admin's own message plus a note about the attached export.
export function buildAdminReportEmail(opts: { subject: string; message: string; filename: string }): { subject: string; html: string } {
  const messageHtml = opts.message
    ? renderParagraph(escapeHtml(opts.message).replace(/\r?\n/g, '<br />'))
    : renderParagraph('Please find the attached report.')

  const body = `${messageHtml}${renderParagraph(`<span style="color:#6b7280;font-size:13px;">Attached: ${escapeHtml(opts.filename)}</span>`)}`

  const html = renderEmailShell({
    preheader: opts.subject,
    title: opts.subject,
    body,
    footer: 'Sent from the Dakar Auto admin dashboard.',
  })

  return { subject: opts.subject, html }
}

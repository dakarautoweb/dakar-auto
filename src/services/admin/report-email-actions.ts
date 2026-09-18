'use server'

import { sendTableReportEmail } from '@/src/services/email'
import { requireAdmin } from './auth'

export type SendReportResult = { ok: true } | { ok: false; error: 'invalid_email' | 'missing_subject' | 'empty_csv' | 'not_configured' | 'send_failed' }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Export/Share -> "Send by email" on an admin table. The client already
// has the exact filtered/sorted/visible-columns data on screen (see
// data-table.tsx's buildExportTable) and builds the CSV text itself before
// calling this — this action's job is auth + validation + the actual send,
// never re-fetching or re-filtering data server-side. The CSV never
// contains anything this admin session couldn't already see, and it goes
// through requireAdmin() like every other admin mutation, so building it
// client-side is not a security boundary issue here.
export async function sendTableReportByEmailAction(input: {
  to: string
  subject: string
  message: string
  csv: string
  filename: string
}): Promise<SendReportResult> {
  await requireAdmin()

  const to = input.to.trim()
  if (!to || !EMAIL_PATTERN.test(to)) return { ok: false, error: 'invalid_email' }

  const subject = input.subject.trim().slice(0, 200)
  if (!subject) return { ok: false, error: 'missing_subject' }

  // Strip the CSV's own leading BOM before checking it's non-empty — a
  // header-only export ("no rows") is still worth sending, only a
  // genuinely empty string is rejected.
  if (!input.csv || input.csv.replace(/^﻿/, '').trim().length === 0) return { ok: false, error: 'empty_csv' }

  const filename = input.filename.trim() || 'report.csv'
  const message = input.message.trim().slice(0, 2000)

  const result = await sendTableReportEmail({ to, subject, message, csv: input.csv, filename })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true }
}

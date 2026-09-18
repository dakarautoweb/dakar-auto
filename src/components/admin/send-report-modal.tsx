'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Mail, X } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses, inputClass } from '@/src/components/ui/styles'
import { sendTableReportByEmailAction } from '@/src/services/admin/report-email-actions'

function noopSubscribe() {
  return () => {}
}

// Hydration-safe "mounted" check for the portal target — same pattern as
// scan-vin-modal.tsx.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}

type Scope = 'all' | 'selected'

// Export/Share -> "Send by email". Builds the CSV client-side (via
// `buildCsv`, backed by data-table.tsx's already-filtered/sorted/visible
// data) and hands it to a real server action that sends through the
// existing Resend infrastructure (src/services/email) — the Resend API key
// never leaves the server, and this never falls back to a `mailto:` link
// (that can't attach a file and would just open the visitor's own mail
// client instead of actually sending anything).
export function SendReportModal({
  dict,
  title,
  hasSelection,
  selectedCount,
  buildCsv,
  exportFileName,
  onClose,
}: {
  dict: Dictionary
  title: string
  hasSelection: boolean
  selectedCount: number
  buildCsv: (scope: Scope) => string
  exportFileName: string
  onClose: () => void
}) {
  const t = dict.admin.tableControls
  const mounted = useMounted()

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(title)
  const [message, setMessage] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<'success' | string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setResult(null)
    startTransition(async () => {
      const csv = buildCsv(scope)
      const response = await sendTableReportByEmailAction({
        to,
        subject,
        message,
        csv,
        filename: `${exportFileName}${scope === 'selected' ? '-selection' : ''}.csv`,
      })
      if (response.ok) {
        setResult('success')
        return
      }
      const errorLabels: Record<string, string> = {
        invalid_email: t.emailErrorInvalid,
        missing_subject: t.emailErrorSubject,
        empty_csv: t.emailErrorEmpty,
        not_configured: t.emailErrorNotConfigured,
        send_failed: t.emailErrorFailed,
      }
      setResult(errorLabels[response.error] ?? t.emailErrorFailed)
    })
  }

  if (!mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 70 }}
      className="flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.sendByEmail}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Mail className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold tracking-tight">{t.sendByEmail}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {result === 'success' ? (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t.emailSuccess}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="report-email-to" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t.emailLabel}
              </label>
              <input
                id="report-email-to"
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="name@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="report-email-subject" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t.subjectLabel}
              </label>
              <input
                id="report-email-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="report-email-message" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t.messageLabel}
              </label>
              <textarea
                id="report-email-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                className={inputClass}
              />
            </div>

            {hasSelection && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="h-3.5 w-3.5 accent-accent" />
                  {t.emailScopeAll}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  {t.emailScopeSelected.replace('{count}', String(selectedCount))}
                </label>
              </div>
            )}

            {result && result !== 'success' && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{result}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className={buttonClasses({ variant: 'secondary-muted', size: 'sm' })}>
                {t.cancel}
              </button>
              <button type="submit" disabled={pending} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                {pending ? t.emailSending : t.emailSend}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

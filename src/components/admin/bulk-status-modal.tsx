'use client'

import { useEffect, useState, useSyncExternalStore, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { RefreshCw, X, AlertCircle } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { StatusSelect } from './status-select'

function noopSubscribe() {
  return () => {}
}

// Same hydration-safe "mounted" check as send-report-modal.tsx.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}

// "Change status" bulk action, opened from BulkActionsMenu. Reuses the same
// StatusSelect used on the parts/vehicle request detail pages (status-
// updater.tsx / vehicle-status-updater.tsx) — the caller supplies the exact
// same statuses/labels/icons/chipClasses those pages already use, so the
// picker looks and behaves identically here. The actual per-row update call
// (updateRequestStatusAction / updateVehicleRequestStatusAction, run once
// per selected id) lives in data-table.tsx / the table wrapper that builds
// this table's BulkActionsConfig — this component only collects "which
// status" and forwards it on confirm.
export function BulkStatusModal({
  dict,
  count,
  statuses,
  labels,
  icons,
  chipClasses,
  newStatusLabel,
  initialStatus,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  dict: Dictionary
  count: number
  statuses: readonly string[]
  labels: Record<string, string>
  icons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>>
  chipClasses: Record<string, string>
  newStatusLabel: string
  initialStatus: string
  pending: boolean
  error: string | null
  onConfirm: (status: string) => void
  onCancel: () => void
}) {
  const t = dict.admin.bulkActions
  const mounted = useMounted()
  const [status, setStatus] = useState(initialStatus)

  // A document-level listener, not onKeyDown on the dialog div: nothing
  // inside the portal has focus by default when it opens (the trigger
  // button that opened it does), so a keydown handler on the dialog itself
  // would never see the Escape press bubble through it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCancel is a stable close-modal callback from the parent
  }, [pending])

  if (!mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 70 }}
      className="flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.changeStatus}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold tracking-tight">{t.statusModalTitle.replace('{count}', String(count))}</h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={pending}
            aria-label={dict.admin.tableControls.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor="bulk-status-select" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {newStatusLabel}
          </label>
          <StatusSelect
            id="bulk-status-select"
            value={status}
            onChange={setStatus}
            statuses={statuses}
            labels={labels}
            icons={icons}
            chipClasses={chipClasses}
            ariaLabel={newStatusLabel}
          />
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className={buttonClasses({ variant: 'secondary-muted', size: 'sm' })}>
            {dict.admin.tableControls.cancel}
          </button>
          <button type="button" onClick={() => onConfirm(status)} disabled={pending} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
            {pending ? t.updating : t.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

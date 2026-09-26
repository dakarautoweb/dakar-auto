'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X, AlertCircle } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'

function noopSubscribe() {
  return () => {}
}

// Same hydration-safe "mounted" check as bulk-delete-modal.tsx.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}

// Permanent-delete confirmation for a single FAQ item — mirrors
// bulk-delete-modal.tsx's shape (same danger-button pattern) but scoped to
// one row instead of a bulk selection, since the FAQ list has no
// multi-select.
export function FaqDeleteModal({
  dict,
  question,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  dict: Dictionary
  question: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = dict.admin.faqPage
  const mounted = useMounted()

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
      aria-label={t.deleteConfirmTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold tracking-tight">{t.deleteConfirmTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label={dict.admin.tableControls.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{t.deleteConfirmBody}</p>
        <p className="mt-2 truncate rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm font-medium text-foreground">{question}</p>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={pending}
            className={buttonClasses({ variant: 'secondary-muted', size: 'sm' })}
          >
            {dict.admin.tableControls.cancel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={buttonClasses({ variant: 'danger-muted', size: 'sm', className: 'gap-1.5' })}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {pending ? t.deleting : t.deleteButton}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

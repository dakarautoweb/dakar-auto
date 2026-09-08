'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { REQUEST_STATUSES } from '@/src/services/admin/statuses'
import { updateRequestStatusAction } from '@/src/services/admin/actions'

export function StatusUpdater({
  dict,
  requestId,
  currentStatus,
}: {
  dict: Dictionary
  requestId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)
  const [pending, startTransition] = useTransition()
  const t = dict.admin.detail

  function handleSubmit() {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateRequestStatusAction(requestId, status, note)
      if (result.ok) {
        setFeedback('success')
        setNote('')
        router.refresh()
      } else {
        setFeedback('error')
      }
    })
  }

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {REQUEST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {(dict.admin.statuses as Record<string, string>)[s]}
          </option>
        ))}
      </select>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t.statusUpdateNoteLabel}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.statusUpdateNotePlaceholder}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || status === currentStatus}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t.statusUpdateSubmitting : t.statusUpdateSubmit}
        </button>
        {feedback === 'success' && <span className="text-sm text-emerald-600 dark:text-emerald-400">{t.statusUpdateSuccess}</span>}
        {feedback === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{t.statusUpdateError}</span>}
      </div>
    </div>
  )
}

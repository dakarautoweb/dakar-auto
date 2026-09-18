'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, Send } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { REQUEST_STATUSES } from '@/src/services/admin/statuses'
import { updateRequestStatusAction } from '@/src/services/admin/actions'
import { buttonClasses, inputClass } from '@/src/components/ui/styles'
import { STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from '@/src/components/admin/status-badge'
import { StatusSelect } from '@/src/components/admin/status-select'

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
      <div>
        <label htmlFor="parts-status-select" className="mb-1.5 block text-sm font-medium text-muted-foreground">
          {t.statusUpdateNewStatusLabel}
        </label>
        <StatusSelect
          id="parts-status-select"
          value={status}
          onChange={setStatus}
          statuses={REQUEST_STATUSES}
          labels={dict.admin.statuses as Record<string, string>}
          icons={STATUS_ICONS}
          chipClasses={STATUS_ICON_CHIP_CLASSES}
          ariaLabel={t.statusUpdateNewStatusLabel}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t.statusUpdateNoteLabel}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.statusUpdateNotePlaceholder}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || status === currentStatus}
          className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, className: 'gap-2' })}
        >
          <Send className="h-4 w-4" strokeWidth={2} />
          {pending ? t.statusUpdateSubmitting : t.statusUpdateSubmit}
        </button>
        {feedback === 'success' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" strokeWidth={2} />
            {t.statusUpdateSuccess}
          </span>
        )}
        {feedback === 'error' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" strokeWidth={2} />
            {t.statusUpdateError}
          </span>
        )}
      </div>
    </div>
  )
}

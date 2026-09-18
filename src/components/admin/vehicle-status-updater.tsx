'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, Send, Info } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { VEHICLE_REQUEST_STATUSES } from '@/src/services/admin/vehicle-request-statuses'
import { updateVehicleRequestStatusAction } from '@/src/services/admin/vehicle-request-actions'
import { buttonClasses } from '@/src/components/ui/styles'
import { STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from '@/src/components/admin/status-badge'
import { StatusSelect } from '@/src/components/admin/status-select'

export function VehicleStatusUpdater({
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
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)
  const [pending, startTransition] = useTransition()
  const t = dict.admin.vehicleRequestDetail
  const statusLabels = dict.admin.vehicleStatuses as Record<string, string>

  function handleSubmit() {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateVehicleRequestStatusAction(requestId, status)
      if (result.ok) {
        setFeedback('success')
        router.refresh()
      } else {
        setFeedback('error')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="vehicle-status-select" className="mb-1.5 block text-sm font-medium text-muted-foreground">
          {t.statusUpdateNewStatusLabel}
        </label>
        <StatusSelect
          id="vehicle-status-select"
          value={status}
          onChange={setStatus}
          statuses={VEHICLE_REQUEST_STATUSES}
          labels={statusLabels}
          icons={STATUS_ICONS}
          chipClasses={STATUS_ICON_CHIP_CLASSES}
          ariaLabel={t.statusUpdateNewStatusLabel}
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

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {t.historyNotTracked}
      </p>
    </div>
  )
}

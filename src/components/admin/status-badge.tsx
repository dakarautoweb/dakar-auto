import type { Dictionary } from '@/src/i18n/dictionaries'

const STATUS_CLASSES: Record<string, string> = {
  request_received: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  on_treatment: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  parts_found: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  vehicle_found: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  direct_communication: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  closed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

// statusMap defaults to the parts-request status labels; pass
// dict.admin.vehicleStatuses to label vehicle-request statuses instead.
export function statusLabel(dict: Dictionary, status: string, statusMap?: Record<string, string>): string {
  const map = (statusMap ?? dict.admin.statuses) as Record<string, string>
  return map[status] ?? status
}

export function StatusBadge({
  dict,
  status,
  statusMap,
}: {
  dict: Dictionary
  status: string
  statusMap?: Record<string, string>
}) {
  const classes = STATUS_CLASSES[status] ?? 'bg-surface text-muted-foreground'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${classes}`}>
      {statusLabel(dict, status, statusMap)}
    </span>
  )
}

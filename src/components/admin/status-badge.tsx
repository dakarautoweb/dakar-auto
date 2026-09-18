import type { ComponentType } from 'react'
import { FileText, Wrench, PackageCheck, Car, CheckCircle2, MessageCircle, XCircle } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'

// The one status → color system for both parts-request and vehicle-request
// statuses (the key sets don't collide, so one map covers both). Exported
// so any status control — this file's own StatusBadge, or a status-picker
// like VehicleStatusUpdater/StatusUpdater — reads colors from here rather
// than re-deciding them per component.
export const STATUS_DOT_CLASSES: Record<string, string> = {
  request_received: 'bg-blue-500',
  on_treatment: 'bg-amber-500',
  parts_found: 'bg-emerald-500',
  vehicle_found: 'bg-emerald-500',
  direct_communication: 'bg-purple-500',
  closed: 'bg-gray-400',
  cancelled: 'bg-red-500',
}

// Same palette as STATUS_DOT_CLASSES, as a text-color utility for icons.
// `-600`/`dark:-400` (not a flat `-500`) — the flat shade reads fine on the
// dark theme's near-black surfaces but is too light/low-contrast against
// this app's light-theme surfaces; same convention as ContactMethodTag.
export const STATUS_TEXT_CLASSES: Record<string, string> = {
  request_received: 'text-blue-600 dark:text-blue-400',
  on_treatment: 'text-amber-600 dark:text-amber-400',
  parts_found: 'text-emerald-600 dark:text-emerald-400',
  vehicle_found: 'text-emerald-600 dark:text-emerald-400',
  direct_communication: 'text-purple-600 dark:text-purple-400',
  closed: 'text-gray-500 dark:text-gray-400',
  cancelled: 'text-red-600 dark:text-red-400',
}

// A small representative icon per status — bare, no capsule, colored via
// STATUS_TEXT_CLASSES by the caller.
export const STATUS_ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  request_received: FileText,
  on_treatment: Wrench,
  parts_found: PackageCheck,
  vehicle_found: Car,
  direct_communication: MessageCircle,
  closed: CheckCircle2,
  cancelled: XCircle,
}

// Same palette as STATUS_DOT_CLASSES/STATUS_TEXT_CLASSES, as a soft tinted
// background for an icon "chip" (StatusSelect's trigger + option rows) —
// richer than a bare colored icon without going as loud as a filled pill.
export const STATUS_ICON_CHIP_CLASSES: Record<string, string> = {
  request_received: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  on_treatment: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  parts_found: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  vehicle_found: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  direct_communication: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  closed: 'bg-gray-400/10 text-gray-500 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

// statusMap defaults to the parts-request status labels; pass
// dict.admin.vehicleStatuses to label vehicle-request statuses instead.
export function statusLabel(dict: Dictionary, status: string, statusMap?: Record<string, string>): string {
  const map = (statusMap ?? dict.admin.statuses) as Record<string, string>
  return map[status] ?? status
}

// Compact status indicator: a small colored dot + plain text, not a big
// filled pill — keeps dense tables readable instead of a wall of colored
// chips (see the admin dashboard rebuild's design-system brief).
export function StatusBadge({
  dict,
  status,
  statusMap,
}: {
  dict: Dictionary
  status: string
  statusMap?: Record<string, string>
}) {
  const dotClass = STATUS_DOT_CLASSES[status] ?? 'bg-muted-foreground/50'

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap text-foreground/85">
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      {statusLabel(dict, status, statusMap)}
    </span>
  )
}

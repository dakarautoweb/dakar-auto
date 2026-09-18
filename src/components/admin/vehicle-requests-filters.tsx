'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { VEHICLE_REQUEST_STATUSES } from '@/src/services/admin/vehicle-request-statuses'
import { inputClass } from '@/src/components/ui/styles'
import { StatusSelect } from './status-select'
import { STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from './status-badge'
import {
  ALL_STATUS_ICON,
  ALL_STATUS_CHIP_CLASS,
  SORT_OPTIONS,
  SORT_ICONS,
  SORT_CHIP_CLASSES,
  ARCHIVE_VIEW_OPTIONS,
  ARCHIVE_VIEW_ICONS,
  ARCHIVE_VIEW_CHIP_CLASSES,
  type ArchiveViewOption,
} from './filter-select-options'

// Same yyyy-mm-dd local-date contract as requests-filters.tsx (see there).
function toDateParam(d: Date): string {
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${da}`
}

const QUICK_STATUS_FILTERS = ['all', 'request_received', 'on_treatment', 'vehicle_found', 'direct_communication'] as const
const QUICK_STATUS_LABEL_KEY = {
  all: 'all',
  request_received: 'new',
  on_treatment: 'inProgress',
  vehicle_found: 'found',
  direct_communication: 'direct',
} as const

export function VehicleRequestsFilters({
  dict,
  initialSearch,
  initialStatus,
  initialSort,
  initialFrom,
  initialTo,
  initialArchived,
}: {
  dict: Dictionary
  initialSearch: string
  initialStatus: string
  initialSort: string
  initialFrom: string
  initialTo: string
  initialArchived: ArchiveViewOption
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch)
  const [customOpen, setCustomOpen] = useState(Boolean(initialFrom || initialTo))
  const [customFrom, setCustomFrom] = useState(initialFrom)
  const [customTo, setCustomTo] = useState(initialTo)
  const t = dict.admin.vehicleRequests
  const qf = dict.admin.vehicleQuickFilters
  const df = dict.admin.dateFilter
  const tc = dict.admin.tableControls

  function navigate(next: { search?: string; status?: string; sort?: string; from?: string | null; to?: string | null; archived?: string }) {
    const params = new URLSearchParams()
    const q = next.search ?? search
    const status = next.status ?? initialStatus
    const sort = next.sort ?? initialSort
    const from = next.from === undefined ? initialFrom : next.from
    const to = next.to === undefined ? initialTo : next.to
    const archived = next.archived ?? initialArchived

    if (q) params.set('q', q)
    if (status && status !== 'all') params.set('status', status)
    if (sort && sort !== 'newest') params.set('sort', sort)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (archived && archived !== 'active') params.set('view', archived)

    const query = params.toString()
    startTransition(() => router.push(query ? `/admin/vehicle-requests?${query}` : '/admin/vehicle-requests'))
  }

  function applyPreset(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    setCustomOpen(false)
    navigate({ from: days === 0 ? toDateParam(to) : toDateParam(from), to: toDateParam(to) })
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          navigate({ search })
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className={`flex-1 ${inputClass}`} />

        <div className="w-full sm:w-56">
          <StatusSelect
            id="vehicle-requests-status-filter"
            value={initialStatus}
            onChange={(status) => navigate({ status })}
            statuses={['all', ...VEHICLE_REQUEST_STATUSES]}
            labels={{ all: t.statusAll, ...(dict.admin.vehicleStatuses as Record<string, string>) }}
            icons={{ all: ALL_STATUS_ICON, ...STATUS_ICONS }}
            chipClasses={{ all: ALL_STATUS_CHIP_CLASS, ...STATUS_ICON_CHIP_CLASSES }}
            ariaLabel={dict.admin.tableControls.filterStatusLabel}
          />
        </div>

        <div className="w-full sm:w-44">
          <StatusSelect
            id="vehicle-requests-sort-filter"
            value={initialSort}
            onChange={(sort) => navigate({ sort })}
            statuses={SORT_OPTIONS}
            labels={{ newest: t.sortNewest, oldest: t.sortOldest }}
            icons={SORT_ICONS}
            chipClasses={SORT_CHIP_CLASSES}
            ariaLabel={t.sortNewest}
          />
        </div>

        <div className="w-full sm:w-40">
          <StatusSelect
            id="vehicle-requests-archived-filter"
            value={initialArchived}
            onChange={(archived) => navigate({ archived })}
            statuses={ARCHIVE_VIEW_OPTIONS}
            labels={{ active: tc.archiveViewActive, archived: tc.archiveViewArchived, all: tc.archiveViewAll }}
            icons={ARCHIVE_VIEW_ICONS}
            chipClasses={ARCHIVE_VIEW_CHIP_CLASSES}
            ariaLabel={tc.archiveViewLabel}
          />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_STATUS_FILTERS.map((status) => {
          const active = initialStatus === status
          return (
            <button
              key={status}
              type="button"
              onClick={() => navigate({ status })}
              className={`inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition duration-200 ${
                active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted-foreground hover:border-accent-hover hover:text-accent-hover'
              }`}
            >
              {qf[QUICK_STATUS_LABEL_KEY[status]]}
            </button>
          )
        })}

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <button
          type="button"
          onClick={() => applyPreset(0)}
          className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-xs font-medium text-muted-foreground transition duration-200 hover:border-accent-hover hover:text-accent-hover"
        >
          {df.today}
        </button>
        <button
          type="button"
          onClick={() => applyPreset(7)}
          className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-xs font-medium text-muted-foreground transition duration-200 hover:border-accent-hover hover:text-accent-hover"
        >
          {df.last7}
        </button>
        <button
          type="button"
          onClick={() => applyPreset(30)}
          className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-xs font-medium text-muted-foreground transition duration-200 hover:border-accent-hover hover:text-accent-hover"
        >
          {df.last30}
        </button>
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition duration-200 ${
            customOpen ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted-foreground hover:border-accent-hover hover:text-accent-hover'
          }`}
        >
          {df.custom}
        </button>
        {(initialFrom || initialTo) && (
          <button
            type="button"
            onClick={() => {
              setCustomFrom('')
              setCustomTo('')
              setCustomOpen(false)
              navigate({ from: null, to: null })
            }}
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-accent hover:underline"
          >
            {df.clear}
          </button>
        )}
      </div>

      {customOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {df.from}
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {df.to}
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => navigate({ from: customFrom || null, to: customTo || null })}
            className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground transition duration-200 hover:bg-accent-hover"
          >
            {df.apply}
          </button>
        </div>
      )}
    </div>
  )
}

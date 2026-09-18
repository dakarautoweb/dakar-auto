'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PartsRequestRow } from '@/src/services/admin/queries'
import { updateRequestStatusAction } from '@/src/services/admin/actions'
import { bulkDeleteRequestsAction, bulkArchiveRequestsAction, bulkRestoreRequestsAction } from '@/src/services/admin/bulk-actions'
import { REQUEST_STATUSES } from '@/src/services/admin/statuses'
import type { ArchiveViewOption } from './filter-select-options'
import { StatusBadge, statusLabel, STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from './status-badge'
import { BrandLogo } from './brand-logo'
import { ContactMethodTag, contactMethodLabel } from './contact-method-tag'
import { AdminDataTable, type AdminColumn, type BulkActionsConfig } from './data-table'

// `columns` below builds real render() callbacks (JSX-producing functions),
// and AdminDataTable is a Client Component — those callbacks have to be
// constructed on the client side of the Server → Client boundary, not
// handed to it from a Server Component. This component is the boundary:
// the pages that call it (app/admin/(dashboard)/{page,requests/page}.tsx)
// stay Server Components and only ever pass plain, serializable
// PartsRequestRow[] data in; the `columns` array with its functions is
// built here, entirely on the client side.
type Row = PartsRequestRow & { __rowId: string }

function vehicleLabel(row: PartsRequestRow): string {
  if (!row.vehicles) return '—'
  return [row.vehicles.year, row.vehicles.make, row.vehicles.model].filter(Boolean).join(' ') || '—'
}

function partSummary(row: PartsRequestRow): string {
  const first = row.parts_request_items[0]
  if (!first) return '—'
  const extra = row.parts_request_items.length - 1
  return extra > 0 ? `${first.part_name} (+${extra})` : first.part_name
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export function RequestsTable({
  dict,
  rows,
  locale,
  filtersSummary,
  view = 'active',
}: {
  dict: Dictionary
  rows: PartsRequestRow[]
  locale: string
  filtersSummary?: string
  // Which of the Active/Archived/All picker produced `rows` — defaults to
  // 'active' for callers that don't have that filter at all (the dashboard's
  // "recent requests" mini-table), which is also the correct default: never
  // silently show archived rows outside an explicit Archived/All view.
  view?: ArchiveViewOption
}) {
  const t = dict.admin.table
  // `id` is this dataset's real, already-unique primary key (also what the
  // "Ouvrir" link below points at) — reused as-is for __rowId rather than
  // inventing a second identifier.
  const rowsWithId: Row[] = rows.map((row) => ({ ...row, __rowId: row.id }))

  const columns: AdminColumn<Row>[] = [
    {
      id: 'requestNumber',
      label: t.requestNumber,
      defaultWidth: 150,
      minWidth: 110,
      sortable: true,
      sortValue: (row) => row.request_number,
      csvValue: (row) => row.request_number,
      render: (row) => <span className="font-mono text-xs">{row.request_number}</span>,
    },
    {
      id: 'date',
      label: t.date,
      defaultWidth: 170,
      minWidth: 130,
      sortable: true,
      sortValue: (row) => new Date(row.created_at).getTime(),
      csvValue: (row) => formatDate(row.created_at, locale),
      render: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.created_at, locale)}</span>,
    },
    {
      id: 'client',
      label: t.customer,
      defaultWidth: 180,
      minWidth: 120,
      sortable: true,
      sortValue: (row) => row.customer_name,
      csvValue: (row) => row.customer_name,
      render: (row) => <span className="font-medium">{row.customer_name}</span>,
    },
    {
      id: 'vehicle',
      label: t.vehicle,
      defaultWidth: 220,
      minWidth: 160,
      sortable: true,
      sortValue: (row) => vehicleLabel(row),
      csvValue: (row) => vehicleLabel(row),
      render: (row) =>
        row.vehicles ? (
          <span className="flex items-center gap-2.5">
            <BrandLogo make={row.vehicles.make} />
            <span className="leading-tight">
              <span className="block font-medium">
                {[row.vehicles.year, row.vehicles.make].filter(Boolean).join(' ')}
              </span>
              <span className="block text-xs text-muted-foreground">{row.vehicles.model}</span>
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'part',
      label: t.part,
      defaultWidth: 190,
      minWidth: 130,
      sortable: true,
      sortValue: (row) => partSummary(row),
      csvValue: (row) => partSummary(row),
      render: (row) => partSummary(row),
    },
    {
      id: 'status',
      label: t.status,
      defaultWidth: 170,
      minWidth: 130,
      sortable: true,
      sortValue: (row) => statusLabel(dict, row.status),
      csvValue: (row) => statusLabel(dict, row.status),
      render: (row) => (
        <span className="flex items-center gap-2">
          <StatusBadge dict={dict} status={row.status} />
          {/* Only meaningful in the "All" view — Active/Archived are each
              already homogeneous, so a per-row tag there would be noise. */}
          {view === 'all' && row.archived_at && (
            <span className="inline-flex h-5 items-center rounded-full bg-amber-500/10 px-2 text-[10px] font-medium text-amber-600 uppercase dark:text-amber-400">
              {dict.admin.tableControls.archiveViewArchived}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'contact',
      label: t.contact,
      defaultWidth: 150,
      minWidth: 110,
      sortable: true,
      sortValue: (row) => row.preferred_contact_method,
      csvValue: (row) => contactMethodLabel(dict, row.preferred_contact_method),
      render: (row) => <ContactMethodTag dict={dict} method={row.preferred_contact_method} />,
    },
    {
      id: 'action',
      label: '',
      defaultWidth: 100,
      minWidth: 90,
      alwaysVisible: true,
      render: (row) => (
        <Link
          href={`/admin/requests/${row.id}`}
          className="group inline-flex items-center gap-1 font-medium text-accent transition duration-200 hover:underline"
        >
          {t.open}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
        </Link>
      ),
    },
  ]

  // Bulk "Change status" reuses the exact same server action the detail
  // page's StatusUpdater calls (updateRequestStatusAction) — just invoked
  // once per selected id instead of duplicating its validation/history/
  // email logic here. Archive/restore/delete each go through a dedicated
  // bulk server action in src/services/admin/bulk-actions.ts (archive/
  // restore via the normal RLS-respecting client, delete via service-role —
  // see that file for why delete specifically needs it).
  const bulkActions: BulkActionsConfig = {
    statuses: REQUEST_STATUSES,
    statusLabels: dict.admin.statuses as Record<string, string>,
    statusIcons: STATUS_ICONS,
    statusChipClasses: STATUS_ICON_CHIP_CLASSES,
    newStatusLabel: dict.admin.detail.statusUpdateNewStatusLabel,
    updateStatus: async (ids, status) => {
      const results = await Promise.all(ids.map((id) => updateRequestStatusAction(id, status, '')))
      const failedCount = results.filter((r) => !r.ok).length
      return { ok: failedCount === 0, failedCount }
    },
    deleteRows: async (ids) => {
      const result = await bulkDeleteRequestsAction(ids)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
    view,
    archiveRows: async (ids) => {
      const result = await bulkArchiveRequestsAction(ids)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
    restoreRows: async (ids) => {
      const result = await bulkRestoreRequestsAction(ids)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
  }

  return (
    <AdminDataTable
      dict={dict}
      locale={locale}
      storageKey="admin-requests-table"
      columns={columns}
      rows={rowsWithId}
      emptyMessage={t.empty}
      exportFileName="demandes-de-pieces"
      reportTitle={dict.admin.requests.title}
      filtersSummary={filtersSummary}
      bulkActions={bulkActions}
    />
  )
}

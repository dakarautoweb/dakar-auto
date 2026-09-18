'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VehicleRequestRow } from '@/src/services/admin/queries'
import { updateVehicleRequestStatusAction } from '@/src/services/admin/vehicle-request-actions'
import { bulkDeleteVehicleRequestsAction, bulkArchiveVehicleRequestsAction, bulkRestoreVehicleRequestsAction } from '@/src/services/admin/bulk-actions'
import { VEHICLE_REQUEST_STATUSES } from '@/src/services/admin/vehicle-request-statuses'
import type { ArchiveViewOption } from './filter-select-options'
import { StatusBadge, statusLabel, STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from './status-badge'
import { BrandLogo } from './brand-logo'
import { ContactMethodTag, contactMethodLabel } from './contact-method-tag'
import { AdminDataTable, type AdminColumn, type BulkActionsConfig } from './data-table'

// See requests-table.tsx's top comment — same reason this needs 'use
// client': `columns` builds real render() callbacks, which have to be
// constructed client-side, not passed in from the (Server Component) page.
type Row = VehicleRequestRow & { __rowId: string }

function vehicleLabel(row: VehicleRequestRow): string {
  const years = [row.year_from, row.year_to].filter(Boolean)
  const yearRange = years.length === 2 && row.year_from !== row.year_to ? `${row.year_from}–${row.year_to}` : years[0] ? String(years[0]) : ''
  return [yearRange, row.make, row.model].filter(Boolean).join(' ') || '—'
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export function VehicleRequestsTable({
  dict,
  rows,
  locale,
  filtersSummary,
  view = 'active',
}: {
  dict: Dictionary
  rows: VehicleRequestRow[]
  locale: string
  filtersSummary?: string
  view?: ArchiveViewOption
}) {
  const t = dict.admin.vehicleRequests.table
  const openLabel = dict.admin.table.open
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
      defaultWidth: 240,
      minWidth: 160,
      sortable: true,
      sortValue: (row) => vehicleLabel(row),
      csvValue: (row) => vehicleLabel(row),
      render: (row) => (
        <span className="flex items-center gap-2.5">
          <BrandLogo make={row.make} />
          <span className="truncate">{vehicleLabel(row)}</span>
        </span>
      ),
    },
    {
      id: 'status',
      label: t.status,
      defaultWidth: 170,
      minWidth: 130,
      sortable: true,
      sortValue: (row) => statusLabel(dict, row.status, dict.admin.vehicleStatuses),
      csvValue: (row) => statusLabel(dict, row.status, dict.admin.vehicleStatuses),
      render: (row) => (
        <span className="flex items-center gap-2">
          <StatusBadge dict={dict} status={row.status} statusMap={dict.admin.vehicleStatuses} />
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
      label: dict.admin.table.contact,
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
          href={`/admin/vehicle-requests/${row.id}`}
          className="group inline-flex items-center gap-1 font-medium text-accent transition duration-200 hover:underline"
        >
          {openLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
        </Link>
      ),
    },
  ]

  // Same reuse story as requests-table.tsx: bulk status change calls the
  // existing updateVehicleRequestStatusAction once per selected id, and
  // bulk delete goes through the dedicated protected bulkDeleteVehicleRequestsAction
  // (see src/services/admin/bulk-actions.ts).
  const bulkActions: BulkActionsConfig = {
    statuses: VEHICLE_REQUEST_STATUSES,
    statusLabels: dict.admin.vehicleStatuses as Record<string, string>,
    statusIcons: STATUS_ICONS,
    statusChipClasses: STATUS_ICON_CHIP_CLASSES,
    newStatusLabel: dict.admin.vehicleRequestDetail.statusUpdateNewStatusLabel,
    updateStatus: async (ids, status) => {
      const results = await Promise.all(ids.map((id) => updateVehicleRequestStatusAction(id, status)))
      const failedCount = results.filter((r) => !r.ok).length
      return { ok: failedCount === 0, failedCount }
    },
    deleteRows: async (ids) => {
      const result = await bulkDeleteVehicleRequestsAction(ids)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
    view,
    archiveRows: async (ids) => {
      const result = await bulkArchiveVehicleRequestsAction(ids)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
    restoreRows: async (ids) => {
      const result = await bulkRestoreVehicleRequestsAction(ids)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
  }

  return (
    <AdminDataTable
      dict={dict}
      locale={locale}
      storageKey="admin-vehicle-requests-table"
      columns={columns}
      rows={rowsWithId}
      emptyMessage={dict.admin.vehicleRequests.empty}
      exportFileName="demandes-de-vehicules"
      reportTitle={dict.admin.vehicleRequests.title}
      filtersSummary={filtersSummary}
      bulkActions={bulkActions}
    />
  )
}

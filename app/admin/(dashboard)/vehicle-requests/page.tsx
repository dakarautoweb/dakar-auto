import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { listVehicleRequests } from '@/src/services/admin/queries'
import { isVehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import { statusLabel } from '@/src/components/admin/status-badge'
import { VehicleRequestsTable } from '@/src/components/admin/vehicle-requests-table'
import { VehicleRequestsFilters } from '@/src/components/admin/vehicle-requests-filters'
import { buildFiltersSummary } from '@/src/lib/build-filters-summary'
import { ARCHIVE_VIEW_OPTIONS, type ArchiveViewOption } from '@/src/components/admin/filter-select-options'

// Same yyyy-mm-dd -> UTC start/end-of-day widening as requests/page.tsx.
function toStartOfDayIso(dateParam: string): string {
  return `${dateParam}T00:00:00.000Z`
}
function toEndOfDayIso(dateParam: string): string {
  return `${dateParam}T23:59:59.999Z`
}

export default async function AdminVehicleRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; from?: string; to?: string; view?: string }>
}) {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const params = await searchParams

  const search = params.q ?? ''
  const status = params.status && isVehicleRequestStatus(params.status) ? params.status : 'all'
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest'
  const from = params.from ?? ''
  const to = params.to ?? ''
  const archived: ArchiveViewOption = params.view && (ARCHIVE_VIEW_OPTIONS as readonly string[]).includes(params.view) ? (params.view as ArchiveViewOption) : 'active'

  const rows = await listVehicleRequests({
    search,
    status,
    sort,
    dateFrom: from ? toStartOfDayIso(from) : undefined,
    dateTo: to ? toEndOfDayIso(to) : undefined,
    archived,
  })

  const filtersSummary = buildFiltersSummary([
    [dict.admin.tableControls.filterSearchLabel, search || null],
    [dict.admin.tableControls.filterStatusLabel, status !== 'all' ? statusLabel(dict, status, dict.admin.vehicleStatuses) : null],
    [dict.admin.tableControls.filterDateRangeLabel, from || to ? `${from || '…'} → ${to || '…'}` : null],
    [dict.admin.tableControls.archiveViewLabel, archived !== 'active' ? dict.admin.tableControls[archived === 'archived' ? 'archiveViewArchived' : 'archiveViewAll'] : null],
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.vehicleRequests.title}</h1>

      <VehicleRequestsFilters
        dict={dict}
        initialSearch={search}
        initialStatus={status}
        initialSort={sort}
        initialFrom={from}
        initialTo={to}
        initialArchived={archived}
      />

      <VehicleRequestsTable dict={dict} rows={rows} locale={locale} filtersSummary={filtersSummary} view={archived} />
    </div>
  )
}

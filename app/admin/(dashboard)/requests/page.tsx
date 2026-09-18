import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { listPartsRequests } from '@/src/services/admin/queries'
import { isRequestStatus } from '@/src/services/admin/statuses'
import { statusLabel } from '@/src/components/admin/status-badge'
import { RequestsTable } from '@/src/components/admin/requests-table'
import { RequestsFilters } from '@/src/components/admin/requests-filters'
import { AdminWatermark } from '@/src/components/admin/admin-watermark'
import { buildFiltersSummary } from '@/src/lib/build-filters-summary'
import { ARCHIVE_VIEW_OPTIONS, type ArchiveViewOption } from '@/src/components/admin/filter-select-options'

// `from`/`to` are yyyy-mm-dd (see requests-filters.tsx's toDateParam) —
// widened here to the start/end of that local day before being handed to
// listPartsRequests, which compares them against created_at (a UTC
// timestamptz) via .gte/.lte.
function toStartOfDayIso(dateParam: string): string {
  return `${dateParam}T00:00:00.000Z`
}
function toEndOfDayIso(dateParam: string): string {
  return `${dateParam}T23:59:59.999Z`
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; from?: string; to?: string; view?: string }>
}) {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const params = await searchParams

  const search = params.q ?? ''
  const status = params.status && isRequestStatus(params.status) ? params.status : 'all'
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest'
  const from = params.from ?? ''
  const to = params.to ?? ''
  const archived: ArchiveViewOption = params.view && (ARCHIVE_VIEW_OPTIONS as readonly string[]).includes(params.view) ? (params.view as ArchiveViewOption) : 'active'

  const rows = await listPartsRequests({
    search,
    status,
    sort,
    dateFrom: from ? toStartOfDayIso(from) : undefined,
    dateTo: to ? toEndOfDayIso(to) : undefined,
    archived,
  })

  const filtersSummary = buildFiltersSummary([
    [dict.admin.tableControls.filterSearchLabel, search || null],
    [dict.admin.tableControls.filterStatusLabel, status !== 'all' ? statusLabel(dict, status) : null],
    [dict.admin.tableControls.filterDateRangeLabel, from || to ? `${from || '…'} → ${to || '…'}` : null],
    [dict.admin.tableControls.archiveViewLabel, archived !== 'active' ? dict.admin.tableControls[archived === 'archived' ? 'archiveViewArchived' : 'archiveViewAll'] : null],
  ])

  return (
    <div className="relative space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.requests.title}</h1>

      <RequestsFilters
        dict={dict}
        initialSearch={search}
        initialStatus={status}
        initialSort={sort}
        initialFrom={from}
        initialTo={to}
        initialArchived={archived}
      />

      <RequestsTable dict={dict} rows={rows} locale={locale} filtersSummary={filtersSummary} view={archived} />
      <AdminWatermark />
    </div>
  )
}

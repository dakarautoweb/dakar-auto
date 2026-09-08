import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { listPartsRequests } from '@/src/services/admin/queries'
import { isRequestStatus } from '@/src/services/admin/statuses'
import { RequestsTable } from '@/src/components/admin/requests-table'
import { RequestsFilters } from '@/src/components/admin/requests-filters'

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>
}) {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const params = await searchParams

  const search = params.q ?? ''
  const status = params.status && isRequestStatus(params.status) ? params.status : 'all'
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest'

  const rows = await listPartsRequests({ search, status, sort })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.requests.title}</h1>

      <RequestsFilters dict={dict} initialSearch={search} initialStatus={status} initialSort={sort} />

      <RequestsTable dict={dict} rows={rows} locale={locale} />
    </div>
  )
}

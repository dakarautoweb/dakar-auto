import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { listVehicleRequests } from '@/src/services/admin/queries'
import { isVehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import { VehicleRequestsTable } from '@/src/components/admin/vehicle-requests-table'
import { VehicleRequestsFilters } from '@/src/components/admin/vehicle-requests-filters'

export default async function AdminVehicleRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>
}) {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const params = await searchParams

  const search = params.q ?? ''
  const status = params.status && isVehicleRequestStatus(params.status) ? params.status : 'all'
  const sort = params.sort === 'oldest' ? 'oldest' : 'newest'

  const rows = await listVehicleRequests({ search, status, sort })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.vehicleRequests.title}</h1>

      <VehicleRequestsFilters dict={dict} initialSearch={search} initialStatus={status} initialSort={sort} />

      <VehicleRequestsTable dict={dict} rows={rows} locale={locale} />
    </div>
  )
}

import Link from 'next/link'
import { Inbox, Clock, Wrench, PackageCheck, CalendarClock, Car } from 'lucide-react'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getDashboardStats, getVehicleRequestsStats, listPartsRequests } from '@/src/services/admin/queries'
import { RequestsTable } from '@/src/components/admin/requests-table'
import { KpiCard } from '@/src/components/admin/kpi-card'

export default async function AdminDashboardPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)

  const [stats, vehicleStats, recent] = await Promise.all([
    getDashboardStats(),
    getVehicleRequestsStats(),
    listPartsRequests({ sort: 'newest' }),
  ])

  const cards = dict.admin.dashboard.cards
  const secondary = dict.admin.kpiSecondary

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.dashboard.title}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={cards.total} value={stats.total} secondary={secondary.total} icon={Inbox} tone="orange" />
        <KpiCard label={cards.requestReceived} value={stats.requestReceived} secondary={secondary.requestReceived} icon={Clock} tone="blue" />
        <KpiCard label={cards.onTreatment} value={stats.onTreatment} secondary={secondary.onTreatment} icon={Wrench} tone="amber" />
        <KpiCard label={cards.partsFound} value={stats.partsFound} secondary={secondary.partsFound} icon={PackageCheck} tone="green" />
        <KpiCard label={cards.today} value={stats.today} secondary={secondary.today} icon={CalendarClock} tone="purple" />
        <KpiCard
          label={cards.vehicleRequests}
          value={vehicleStats.total}
          secondary={secondary.vehicleRequests}
          icon={Car}
          tone="red"
          href="/admin/vehicle-requests"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{dict.admin.dashboard.recentTitle}</h2>
          <Link href="/admin/requests" className="text-sm font-medium text-accent transition duration-200 hover:underline">
            {dict.admin.dashboard.viewAll}
          </Link>
        </div>
        <RequestsTable dict={dict} rows={recent.slice(0, 10)} locale={locale} />
      </div>
    </div>
  )
}

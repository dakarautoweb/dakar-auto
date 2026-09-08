import Link from 'next/link'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getDashboardStats, getVehicleRequestsStats, listPartsRequests } from '@/src/services/admin/queries'
import { RequestsTable } from '@/src/components/admin/requests-table'

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl border border-border bg-surface/60 p-5 transition hover:border-accent">
        {content}
      </Link>
    )
  }

  return <div className="rounded-2xl border border-border bg-surface/60 p-5">{content}</div>
}

export default async function AdminDashboardPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)

  const [stats, vehicleStats, recent] = await Promise.all([
    getDashboardStats(),
    getVehicleRequestsStats(),
    listPartsRequests({ sort: 'newest' }),
  ])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">{dict.admin.dashboard.title}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={dict.admin.dashboard.cards.total} value={stats.total} />
        <StatCard label={dict.admin.dashboard.cards.requestReceived} value={stats.requestReceived} />
        <StatCard label={dict.admin.dashboard.cards.onTreatment} value={stats.onTreatment} />
        <StatCard label={dict.admin.dashboard.cards.partsFound} value={stats.partsFound} />
        <StatCard label={dict.admin.dashboard.cards.today} value={stats.today} />
        <StatCard label={dict.admin.dashboard.cards.vehicleRequests} value={vehicleStats.total} href="/admin/vehicle-requests" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{dict.admin.dashboard.recentTitle}</h2>
          <Link href="/admin/requests" className="text-sm font-medium text-accent hover:underline">
            {dict.admin.dashboard.viewAll}
          </Link>
        </div>
        <RequestsTable dict={dict} rows={recent.slice(0, 10)} locale={locale} />
      </div>
    </div>
  )
}

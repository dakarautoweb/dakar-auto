import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getAdminStatistics } from '@/src/services/admin/queries'
import { cardClasses } from '@/src/components/ui/styles'

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={cardClasses({ padding: 'sm', className: 'flex flex-col items-center justify-center text-center' })}>
      <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
    </div>
  )
}

function BarList({
  items,
  colorClass,
  emptyLabel,
}: {
  items: { label: string; count: number }[]
  colorClass: string
  emptyLabel: string
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  const nonZero = items.filter((i) => i.count > 0)

  if (nonZero.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.count}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function AdminStatisticsPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const stats = await getAdminStatistics()
  const t = dict.admin.statistics

  const partsStatusItems = stats.partsByStatus.map((s) => ({
    label: (dict.admin.statuses as Record<string, string>)[s.status] ?? s.status,
    count: s.count,
  }))
  const vehicleStatusItems = stats.vehiclesByStatus.map((s) => ({
    label: dict.admin.vehicleStatuses[s.status as keyof typeof dict.admin.vehicleStatuses] ?? s.status,
    count: s.count,
  }))

  const partsVsVehiclesTotal = Math.max(1, stats.parts.total + stats.vehicles.total)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.partsLabel}</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatTile label={t.today} value={stats.parts.today} />
          <StatTile label={t.thisWeek} value={stats.parts.thisWeek} />
          <StatTile label={t.thisMonth} value={stats.parts.thisMonth} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.vehiclesLabel}</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatTile label={t.today} value={stats.vehicles.today} />
          <StatTile label={t.thisWeek} value={stats.vehicles.thisWeek} />
          <StatTile label={t.thisMonth} value={stats.vehicles.thisMonth} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClasses({ padding: 'sm' })}>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t.byStatusTitle} — {t.partsLabel}
          </h2>
          <BarList items={partsStatusItems} colorClass="bg-accent" emptyLabel={t.noData} />
        </section>

        <section className={cardClasses({ padding: 'sm' })}>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t.byStatusTitle} — {t.vehiclesLabel}
          </h2>
          <BarList items={vehicleStatusItems} colorClass="bg-purple-500" emptyLabel={t.noData} />
        </section>

        <section className={cardClasses({ padding: 'sm' })}>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.topMakesTitle}</h2>
          <BarList
            items={stats.topMakes.map((m) => ({ label: m.make, count: m.count }))}
            colorClass="bg-blue-500"
            emptyLabel={t.noData}
          />
        </section>

        <section className={cardClasses({ padding: 'sm' })}>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.topCategoriesTitle}</h2>
          <BarList
            items={stats.topCategories.map((c) => ({
              label: dict.categories.items.find((item) => item.key === c.category)?.title ?? c.category,
              count: c.count,
            }))}
            colorClass="bg-emerald-500"
            emptyLabel={t.noData}
          />
        </section>

        <section className={cardClasses({ padding: 'sm' })}>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.partsVsVehiclesTitle}</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-accent" style={{ width: `${(stats.parts.total / partsVsVehiclesTotal) * 100}%` }} />
            <div className="h-full bg-purple-500" style={{ width: `${(stats.vehicles.total / partsVsVehiclesTotal) * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" /> {t.partsLabel} — {stats.parts.total}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-purple-500" /> {t.vehiclesLabel} — {stats.vehicles.total}
            </span>
          </div>
        </section>

        <section className={cardClasses({ padding: 'sm' })}>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.avgProcessingTitle}</h2>
          {stats.avgProcessingHours === null ? (
            <p className="text-sm text-muted-foreground">{t.avgProcessingUnavailable}</p>
          ) : (
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {t.avgProcessingValue.replace('{hours}', String(stats.avgProcessingHours))}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

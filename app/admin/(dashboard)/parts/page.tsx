import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getAdminStatistics } from '@/src/services/admin/queries'
import { PART_CATEGORY_KEYS, PART_SUBCATEGORY_KEYS } from '@/src/lib/parts-catalog'
import { CategoryIcon } from '@/src/components/home/icons'
import { cardClasses } from '@/src/components/ui/styles'

// Read-only reference page: the public parts catalog (src/lib/parts-catalog.ts
// — structural config, no admin CRUD exists for it) cross-referenced with
// real demand counted from parts_request_items (see getAdminStatistics).
// Deliberately not an inventory/stock manager — there's no such data model
// in this schema, and the brief is explicit about not fabricating one.
export default async function AdminPartsPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.admin.partsPage
  const stats = await getAdminStatistics()

  const demandByCategory = new Map(stats.topCategories.map((c) => [c.category, c.count]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.description}</p>
      </div>

      <div className={cardClasses({ padding: 'sm' })}>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.catalogSection}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t.catalogSectionDescription}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PART_CATEGORY_KEYS.map((key) => {
            const category = dict.categories.items.find((c) => c.key === key)
            const subcategoryCount = PART_SUBCATEGORY_KEYS[key].length
            const requestCount = demandByCategory.get(key) ?? 0
            return (
              <div key={key} className="rounded-xl border border-border bg-surface/60 p-4">
                <CategoryIcon name={key} className="h-9 w-9 text-accent-gold" />
                <p className="mt-3 text-sm font-semibold">{category?.title ?? key}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.subcategoriesCount.replace('{count}', String(subcategoryCount))}</p>
                <p className="mt-2 text-xs font-medium text-accent">
                  {requestCount > 0 ? `${requestCount} · ${t.demandSection.toLowerCase()}` : t.noRequestsYet}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className={cardClasses({ padding: 'sm' })}>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.demandSection}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t.demandSectionDescription}</p>

        <div className="mt-4 space-y-3">
          {stats.topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noRequestsYet}</p>
          ) : (
            (() => {
              const max = Math.max(1, ...stats.topCategories.map((c) => c.count))
              return stats.topCategories.map((c) => {
                const category = dict.categories.items.find((item) => item.key === c.category)
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{category?.title ?? c.category}</span>
                      <span className="tabular-nums text-muted-foreground">{c.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })
            })()
          )}
        </div>
      </div>
    </div>
  )
}

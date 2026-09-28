'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { inputClass, cardClasses } from '@/src/components/ui/styles'
import { MakeIcon, YearIcon, PriceTagIcon, ChevronDownIcon, ResetIcon } from '@/src/components/ui/dakar-icons'

// Lightweight, URL-search-param-driven filters — no client-side filtering
// library and no local state beyond the controlled inputs themselves. Every
// change pushes a new query string, the server component page re-reads
// searchParams and re-queries getPublicVehicles — same "server owns the
// data, client owns the URL" shape as the admin's date/status filters.
//
// Fields size purely off `inputClass` (which already bakes in `w-full`) —
// no fixed pixel widths layered on top. Stacking a second, conflicting
// width utility on the same element (the previous `${inputClass} w-auto`)
// is exactly what made the status filter clip on narrow screens: two
// width utilities of equal CSS specificity don't reliably resolve by
// className string order, only by Tailwind's own internal generation
// order (same footgun documented on buttonClasses' `pill` option).
const selectClass = `${inputClass} appearance-none pr-9`

export function VehiclesFilters({
  dict,
  makes,
  initialMake,
  initialYear,
  initialMinPrice,
  initialMaxPrice,
  initialStatus,
}: {
  dict: Dictionary
  makes: string[]
  initialMake: string
  initialYear: string
  initialMinPrice: string
  initialMaxPrice: string
  initialStatus: string
}) {
  const t = dict.vehiclesPage.filters
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters = Boolean(initialMake || initialYear || initialMinPrice || initialMaxPrice || initialStatus)

  return (
    <div className={cardClasses({ padding: 'sm' })}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MakeIcon className="h-4 w-4 shrink-0" />
            {t.makeLabel}
          </span>
          <div className="relative">
            <select defaultValue={initialMake} onChange={(e) => update('make', e.target.value)} className={selectClass}>
              <option value="">{t.makeAll}</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <YearIcon className="h-4 w-4 shrink-0" />
            {t.yearLabel}
          </span>
          <input type="number" defaultValue={initialYear} placeholder={t.yearAll} onBlur={(e) => update('year', e.target.value)} className={inputClass} />
        </label>

        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PriceTagIcon className="h-4 w-4 shrink-0" />
            {t.priceLabel}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              defaultValue={initialMinPrice}
              placeholder="Min"
              onBlur={(e) => update('minPrice', e.target.value)}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <span className="shrink-0 text-muted-foreground">–</span>
            <input
              type="number"
              min={0}
              defaultValue={initialMaxPrice}
              placeholder="Max"
              onBlur={(e) => update('maxPrice', e.target.value)}
              className={`${inputClass} min-w-0 flex-1`}
            />
          </div>
        </label>

        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.statusLabel}</span>
          <div className="relative">
            <select defaultValue={initialStatus} onChange={(e) => update('status', e.target.value)} className={selectClass}>
              <option value="">{t.statusAll}</option>
              <option value="available">{t.statusAvailable}</option>
              <option value="reserved">{t.statusReserved}</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
      </div>

      {hasFilters && (
        <div className="mt-4 flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-accent"
          >
            <ResetIcon className="h-4 w-4" />
            {t.reset}
          </button>
        </div>
      )}
    </div>
  )
}

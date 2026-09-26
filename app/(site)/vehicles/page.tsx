import Link from 'next/link'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getPublicVehicleMakes, getPublicVehicles } from '@/src/services/inventory/queries'
import { VehicleCard } from '@/src/components/vehicles/vehicle-card'
import { VehiclesFilters } from '@/src/components/vehicles/vehicles-filters'
import { buttonClasses } from '@/src/components/ui/styles'
import { CarSideIcon } from '@/src/components/home/icons'

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ make?: string; year?: string; minPrice?: string; maxPrice?: string; status?: string }>
}) {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.vehiclesPage
  const params = await searchParams

  const make = params.make ?? ''
  const year = params.year ?? ''
  const minPrice = params.minPrice ?? ''
  const maxPrice = params.maxPrice ?? ''
  const status = params.status === 'available' || params.status === 'reserved' ? params.status : ''

  const [makes, vehicles] = await Promise.all([
    getPublicVehicleMakes(),
    getPublicVehicles({
      make: make || undefined,
      year: year ? Number(year) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      status: status || undefined,
    }),
  ])

  const hasAnyFilter = Boolean(make || year || minPrice || maxPrice || status)

  return (
    <div>
      {/* Garage hero — garage-hero.webp (1876×838, ~2.24:1) is an <img>
          with object-cover, so it only ever scales uniformly and crops the
          overflow; never stretched. object-position keeps the lit garage
          doors (center-right of the photo) in frame as the hero narrows,
          while the tool benches on the left sit under the copy's scrim.
          The photo is already dark, so the hero stays cinematic in both
          themes; only the overlay strength and the bottom fade (into
          --background) differ between light and dark. */}
      <section className="relative isolate overflow-hidden border-b border-border bg-[#0b0b0c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vehicles/garage-hero.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[68%_45%] sm:object-[60%_45%] lg:object-[center_45%]"
        />
        {/* Full-frame darkening, then a heavy left scrim behind the copy,
            a soft right-edge vignette, and top/bottom fades. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/25 dark:bg-black/40" />
        <div aria-hidden="true" className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-black/80 via-black/45 to-transparent sm:from-black/90 sm:via-black/60 lg:w-3/4" />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 w-1/4 bg-gradient-to-l from-black/55 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-20 bg-gradient-to-b from-black/60 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-14 bg-gradient-to-t from-background/60 to-transparent sm:h-20 dark:h-24 dark:from-background/90 dark:via-background/30 sm:dark:h-28" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent-gold/60 via-accent-gold/20 to-transparent" />

        <div className="mx-auto flex min-h-[18rem] max-w-7xl items-center px-4 pt-14 pb-16 sm:min-h-[22rem] sm:px-6 lg:min-h-[26rem] lg:px-8 lg:pt-20 lg:pb-24">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-accent uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-accent to-accent-gold" />
              {t.eyebrow}
            </span>
            <h1 className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight text-balance text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-5xl lg:text-6xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">{t.description}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        {/* Filters float across the hero's bottom edge: a negative top margin
            (in flow, no absolute positioning) pulls the panel up ~24px on
            phones, ~48px from sm and ~56px from lg — about half the
            single-row panel's height — while relative z-10 keeps it above
            the hero (and below the z-50 sticky header). The wrapper only adds
            a deeper, same-radius shadow; the panel itself is unchanged. */}
        <div className="relative z-10 -mt-6 rounded-2xl shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] sm:-mt-12 lg:-mt-14 dark:shadow-[0_24px_56px_-16px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
          <VehiclesFilters dict={dict} makes={makes} initialMake={make} initialYear={year} initialMinPrice={minPrice} initialMaxPrice={maxPrice} initialStatus={status} />
        </div>

        {vehicles.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} dict={dict} locale={locale} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <CarSideIcon className="h-7 w-7" />
            </span>
            <p className="text-muted-foreground">{hasAnyFilter ? t.empty : t.emptyNoInventory}</p>
            <Link href="/source-a-vehicle" className={buttonClasses({ variant: 'gold', size: 'md', pill: true })}>
              {t.emptyCta}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

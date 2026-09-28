import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PublicVehicleSummary } from '@/src/services/inventory/types'
import { cardClasses } from '@/src/components/ui/styles'
import { getBrandLogoPath } from '@/src/lib/brand-logos'
import { ArrowRightIcon, CarSideIcon, MileageIcon, EngineSpecIcon, TransmissionSpecIcon } from '@/src/components/ui/dakar-icons'

function formatPrice(price: number | null, currency: string, locale: string, fallback: string): string {
  if (price === null) return fallback
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

export function VehicleCard({ dict, locale, vehicle }: { dict: Dictionary; locale: string; vehicle: PublicVehicleSummary }) {
  const t = dict.vehiclesPage.card
  const isReserved = vehicle.status === 'reserved'
  const logo = getBrandLogoPath(vehicle.make)

  const meta = [
    vehicle.mileage !== null && { icon: MileageIcon, value: `${vehicle.mileage.toLocaleString(locale === 'fr' ? 'fr-CA' : 'en-CA')} km` },
    vehicle.engineDisplacement && { icon: EngineSpecIcon, value: vehicle.engineDisplacement },
    vehicle.transmission && { icon: TransmissionSpecIcon, value: vehicle.transmission },
  ].filter(Boolean) as { icon: typeof MileageIcon; value: string }[]
  const metaCols = meta.length === 3 ? 'grid-cols-3' : meta.length === 2 ? 'grid-cols-2' : 'grid-cols-1'

  // The whole card is the link — no separate CTA button; the gold arrow and
  // the bottom rule that grows on hover are the "open" affordance.
  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      aria-label={`${t.cta} — ${vehicle.make} ${vehicle.model} ${vehicle.year}`}
      className={cardClasses({
        padding: 'none',
        className: 'group relative flex flex-col overflow-hidden hover:-translate-y-1 hover:border-accent-gold/45 hover:shadow-card-hover',
      })}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface">
        {vehicle.primaryPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage-hosted photo, not a static/optimizable asset
          <img
            src={vehicle.primaryPhotoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CarSideIcon className="h-12 w-12 text-muted-foreground/50 [stroke-width:1.5]" />
          </div>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
        {/* The badge always sits on the photo, so it keeps one dark-glass
            look in both themes; the warm gold text/border tie it to the
            card's accent rather than a generic grey chip. */}
        <span className="absolute top-3 right-3 rounded-lg border border-[#d9a441]/50 bg-black/65 px-2.5 py-1 text-xs font-bold tracking-wider text-[#f1cf8c] tabular-nums shadow-sm">
          {vehicle.year}
        </span>
        {isReserved && (
          <span className="absolute top-3 left-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">{t.reserved}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 min-[360px]:gap-3.5">
          {/* Transparent chrome logo, no tile: rendered as-is on dark, and
              deepened to graphite on light so it stays legible. */}
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-11 w-11 shrink-0 object-contain min-[360px]:h-14 min-[360px]:w-14 brightness-[0.55] contrast-[1.4] drop-shadow-sm transition duration-300 group-hover:scale-105 dark:brightness-100 dark:contrast-100"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent-gold uppercase">{vehicle.make}</p>
            <p className="mt-0.5 break-words min-[360px]:truncate text-2xl leading-tight font-bold tracking-tight text-foreground">{vehicle.model}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base leading-tight font-bold tracking-tight text-accent tabular-nums min-[360px]:text-[1.125rem] sm:text-xl">
              {formatPrice(vehicle.price, vehicle.currency, locale, t.priceOnRequest)}
            </p>
          </div>
        </div>

        {meta.length > 0 && (
          <div className={`mt-4 grid ${metaCols} divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface/60`}>
            {meta.map((item) => (
              <div key={item.value} className="flex min-w-0 flex-col items-center gap-1.5 px-1 py-3 text-center min-[360px]:px-2">
                <item.icon className="h-5 w-5 shrink-0 text-accent-gold" />
                <span className="w-full text-[0.75rem] leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-foreground/85 min-[360px]:truncate min-[360px]:text-[0.8rem] min-[360px]:tracking-normal">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-end pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground transition duration-200 group-hover:text-accent">
            {t.cta}
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Gold rule that draws across the card's base on hover. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-accent-gold via-accent to-accent-gold transition-transform duration-500 ease-out group-hover:scale-x-100"
      />
    </Link>
  )
}

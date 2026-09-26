import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getPublicVehicleById, getRelatedVehicles } from '@/src/services/inventory/queries'
import { getPublicSiteSettings } from '@/src/services/site-settings/queries'
import { normalizePhoneDigits, buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import { VehicleGallery } from '@/src/components/vehicles/vehicle-gallery'
import { VehicleCard } from '@/src/components/vehicles/vehicle-card'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import { getBrandLogoPath } from '@/src/lib/brand-logos'
import {
  GaugeIcon,
  EngineIcon,
  TransmissionIcon,
  FuelIcon,
  PaletteIcon,
  CalendarIcon,
  CarSideIcon,
  QualityIcon,
  MailIcon,
  PhoneIcon,
  WhatsAppIcon,
  CheckIcon,
} from '@/src/components/home/icons'

function formatPrice(price: number | null, currency: string, locale: string, fallback: string): string {
  if (price === null) return fallback
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.vehicleDetailPage

  const vehicle = await getPublicVehicleById(id, locale)
  if (!vehicle) notFound()

  const [settings, relatedVehicles] = await Promise.all([getPublicSiteSettings(), getRelatedVehicles(vehicle.id, vehicle.make, vehicle.model)])
  const hasContact = settings.whatsapp || settings.email || settings.phone
  const logo = getBrandLogoPath(vehicle.make)

  const specs = [
    vehicle.mileage !== null && { icon: GaugeIcon, label: t.mileageLabel, value: `${vehicle.mileage.toLocaleString(locale === 'fr' ? 'fr-CA' : 'en-CA')} ${t.kmSuffix}` },
    vehicle.engineDisplacement && { icon: EngineIcon, label: t.engineLabel, value: vehicle.engineDisplacement },
    vehicle.transmission && { icon: TransmissionIcon, label: t.transmissionLabel, value: vehicle.transmission },
    vehicle.fuelType && { icon: FuelIcon, label: t.fuelTypeLabel, value: vehicle.fuelType },
    vehicle.color && { icon: PaletteIcon, label: t.colorLabel, value: vehicle.color },
    { icon: CalendarIcon, label: t.yearLabel, value: String(vehicle.year) },
    { icon: QualityIcon, label: t.makeLabel, value: vehicle.make },
    { icon: CarSideIcon, label: t.modelLabel, value: vehicle.model },
  ].filter(Boolean) as { icon: typeof GaugeIcon; label: string; value: string }[]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Link href="/vehicles" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-accent">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        {t.backToList}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-24">
          <VehicleGallery photos={vehicle.photos} alt={`${vehicle.make} ${vehicle.model}`} />
        </div>

        <div className="space-y-5">
          {/* Summary panel — large bare logo and a big make/model lockup on
              top, then year and price split left/right under a hairline. A
              faint oversized logo watermark fills the right side so the
              panel never reads as empty. */}
          <div className={cardClasses({ tone: 'raised', padding: 'none', className: 'relative overflow-hidden p-6 sm:p-8' })}>
            <span aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent-gold/70 to-transparent" />
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 -right-10 h-52 w-52 object-contain opacity-[0.05] brightness-[0.4] dark:opacity-[0.06] dark:brightness-100"
              />
            )}
            <div className="relative flex items-center gap-5">
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt=""
                  className="h-16 w-16 shrink-0 object-contain brightness-[0.55] contrast-[1.4] drop-shadow-md sm:h-20 sm:w-20 dark:brightness-100 dark:contrast-100"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-semibold tracking-[0.25em] text-accent-gold uppercase">{vehicle.make}</span>
                  {vehicle.status === 'reserved' && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">{t.reserved}</span>}
                </div>
                <h1 className="mt-1 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">{vehicle.model}</h1>
              </div>
            </div>

            <div className="relative mt-7 flex items-end justify-between gap-6 border-t border-border pt-5">
              <div>
                <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t.yearLabel}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">{vehicle.year}</p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t.priceLabel}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-accent tabular-nums sm:text-4xl">{formatPrice(vehicle.price, vehicle.currency, locale, t.priceOnRequest)}</p>
              </div>
            </div>
          </div>

          {specs.length > 0 && (
            <div className={cardClasses({ padding: 'none', className: 'overflow-hidden' })}>
              <div className="flex items-center gap-3 px-6 pt-5">
                <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t.specsTitle}</h2>
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-accent-gold/40 to-transparent" />
              </div>
              {/* Hairline grid instead of floating icon chips: each spec is
                  a cell with a large bare gold icon, separated by 1px gaps
                  over the border color. */}
              <div className="mt-4 grid grid-cols-2 gap-px border-t border-border bg-border">
                {specs.map((spec, i) => (
                  <div
                    key={spec.label}
                    className={`group/spec flex items-center gap-4 bg-card px-5 py-4 transition-colors duration-200 hover:bg-surface-raised ${specs.length % 2 === 1 && i === specs.length - 1 ? 'col-span-2' : ''}`}
                  >
                    <spec.icon className="h-8 w-8 shrink-0 text-accent-gold transition-transform duration-200 group-hover/spec:scale-110" />
                    <div className="min-w-0">
                      <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">{spec.label}</p>
                      <p className="mt-0.5 truncate text-base font-semibold text-foreground">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vehicle.description && (
            <div className={cardClasses({ padding: 'sm' })}>
              <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t.descriptionTitle}</h2>
              <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-foreground/90">{vehicle.description}</p>
            </div>
          )}

          {vehicle.options.length > 0 && (
            <div className={cardClasses({ padding: 'sm' })}>
              <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t.optionsTitle}</h2>
              <ul className="mt-3 grid gap-x-4 gap-y-2 text-sm text-foreground sm:grid-cols-2">
                {vehicle.options.map((option) => (
                  <li key={option} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" />
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasContact && (
            <div className={cardClasses({ padding: 'none', tone: 'solid-accent', className: 'relative overflow-hidden p-6 sm:p-7' })}>
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-gold via-accent to-accent-gold" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">{t.contactTitle}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{t.contactDescription}</p>
              {/* WhatsApp leads as the filled primary action; phone and email
                  sit beside it as quieter outlined options. */}
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {settings.whatsapp && (
                  <a
                    href={buildWhatsAppLinkFrom(settings.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ variant: 'primary', size: 'lg', className: 'h-12 w-full shadow-glow sm:col-span-2' })}
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    WhatsApp
                  </a>
                )}
                {settings.phone && (
                  <a
                    href={`tel:${normalizePhoneDigits(settings.phone)}`}
                    className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-px hover:border-accent-gold/50 hover:text-accent-gold"
                  >
                    <PhoneIcon className="h-[18px] w-[18px] shrink-0 text-accent-gold" />
                    <span className="truncate">{settings.phone}</span>
                  </a>
                )}
                {settings.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    className={`inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-px hover:border-accent-gold/50 hover:text-accent-gold ${settings.phone ? '' : 'sm:col-span-2'}`}
                  >
                    <MailIcon className="h-[18px] w-[18px] shrink-0 text-accent-gold" />
                    <span className="truncate">{settings.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {relatedVehicles.length > 0 && (
        <div className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-bold tracking-tight text-balance">{t.relatedTitle}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedVehicles.map((related) => (
              <VehicleCard key={related.id} dict={dict} locale={locale} vehicle={related} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

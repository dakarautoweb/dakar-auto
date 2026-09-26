import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { Locale } from '@/src/i18n/config'
import { getFeaturedVehicles } from '@/src/services/inventory/queries'
import { VehicleCard } from '@/src/components/vehicles/vehicle-card'
import { buttonClasses } from '@/src/components/ui/styles'
import { SectionHeading } from './section-heading'

// Homepage section — entirely omitted (returns null, rendering nothing,
// not even an empty heading) whenever there are no featured available
// vehicles, per the brief's "do not add the section if there are no
// featured vehicles."
export async function FeaturedVehicles({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const vehicles = await getFeaturedVehicles(3)
  if (vehicles.length === 0) return null

  const t = dict.featuredVehicles

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
          <Link href="/vehicles" className={buttonClasses({ variant: 'secondary', size: 'md' })}>
            {t.cta}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} dict={dict} locale={locale} vehicle={vehicle} />
          ))}
        </div>
      </div>
    </section>
  )
}

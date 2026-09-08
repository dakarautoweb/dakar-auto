import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { VehicleRequestWizard } from '@/src/components/vehicle-request-wizard/wizard'

export default async function SourceAVehiclePage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{dict.sourceVehiclePage.title}</h1>
        <p className="mt-3 text-muted-foreground">{dict.sourceVehiclePage.description}</p>
      </div>

      <VehicleRequestWizard dict={dict} locale={locale} />
    </div>
  )
}

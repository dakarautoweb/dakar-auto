import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import { useSiteSettings } from '@/src/components/site-settings-context'
import { CheckCircleIcon } from '@/src/components/home/icons'
import { buttonClasses, cardClasses, iconCircleClasses } from '@/src/components/ui/styles'
import type { VehicleWantedFormState } from './types'

export function SuccessStep({
  dict,
  requestNumber,
  trackingToken,
  vehicle,
}: {
  dict: Dictionary
  requestNumber: string
  trackingToken: string
  vehicle: VehicleWantedFormState
}) {
  const t = dict.vehicleRequestWizard.success
  const settings = useSiteSettings()
  const summary = [vehicle.make, vehicle.model].filter(Boolean).join(' ')
  const yearRange = [vehicle.yearFrom, vehicle.yearTo].filter(Boolean).join(' – ')

  return (
    <div className={cardClasses({ tone: 'raised', padding: 'lg', className: 'flex flex-col items-center text-center' })}>
      <div className={iconCircleClasses({ size: 'lg', tone: 'gold' })}>
        <CheckCircleIcon className="h-9 w-9" />
      </div>
      <h2 className="mt-5 text-3xl font-bold tracking-tight">{t.title}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{t.description}</p>

      <div className="mt-6 rounded-xl border border-border bg-surface px-5 py-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.requestNumberLabel}</p>
        <p className="mt-0.5 font-mono text-lg font-semibold">{requestNumber}</p>
      </div>

      {(summary || yearRange) && (
        <p className="mt-3 text-sm text-muted-foreground">{[summary, yearRange].filter(Boolean).join(' · ')}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/track/${trackingToken}`} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
          {t.trackCta}
        </Link>
        {settings.whatsapp && (
          <a href={buildWhatsAppLinkFrom(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {t.whatsappCta}
          </a>
        )}
        {settings.email && (
          <a href={`mailto:${settings.email}`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {t.emailCta}
          </a>
        )}
      </div>

      <Link href="/" className="mt-8 text-sm font-medium text-accent transition duration-200 hover:underline">
        {t.backHome}
      </Link>
    </div>
  )
}

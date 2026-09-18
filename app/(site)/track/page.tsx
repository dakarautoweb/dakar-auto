import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { TrackLookupForm } from '@/src/components/tracking/track-lookup-form'
import { iconCircleClasses } from '@/src/components/ui/styles'
import { RouteIcon } from '@/src/components/home/icons'

// Public entry point for customers who no longer have their tracking link
// (e.g. deleted the email). Looks the request up server-side by
// request_number + email/phone instead of asking for the tracking_token
// itself — see trackLookupAction / lookupTrackingToken for the matching and
// rate-limiting rules.
export default async function TrackLookupPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.tracking.lookup

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:py-20">
      <div className="flex flex-col items-center text-center">
        <span className={iconCircleClasses({ size: 'lg' })}>
          <RouteIcon className="h-8 w-8" />
        </span>
        <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          <span className="h-px w-6 bg-accent/60" aria-hidden="true" />
          {t.eyebrow}
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="mt-8">
        <TrackLookupForm dict={dict} />
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">{t.helpText}</p>
    </div>
  )
}

import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { TrackLookupForm } from '@/src/components/tracking/track-lookup-form'
import { TrackingHeroArt } from '@/src/components/tracking/tracking-hero-art'
import { RouteIcon } from '@/src/components/home/icons'

// Public entry point for customers who no longer have their tracking link
// (e.g. deleted the email). Looks the request up server-side by
// request_number + email/phone instead of asking for the tracking_token
// itself — see trackLookupAction / lookupTrackingToken for the matching and
// rate-limiting rules.
//
// Layout: desktop keeps the heading + form in the left column (the form
// keeps its original ~28rem width); the right side is filled by a large,
// static photo of the Earth drawn behind the content — anchored so the
// planet starts just past the form and runs off the right edge of the
// viewport, faded into the page background (see TrackingHeroArt). Below lg
// it becomes a compact banner above the heading (smaller on phones than on
// tablets) so the form stays the focus.
export default async function TrackLookupPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.tracking.lookup

  return (
    <div className="relative overflow-x-clip">
      <TrackingHeroArt className="pointer-events-none absolute inset-0 hidden lg:block" />

      <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-16 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-20">
        <TrackingHeroArt variant="compact" className="mx-auto mb-6 w-full max-w-[22rem] sm:max-w-[32rem] lg:hidden" />

        <div>
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              <span className="h-px w-6 bg-accent/60" aria-hidden="true" />
              {t.eyebrow}
            </span>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <RouteIcon className="h-7 w-7 shrink-0 text-accent sm:h-8 sm:w-8" />
              {t.title}
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="mt-8">
            <TrackLookupForm dict={dict} />
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground lg:text-left">{t.helpText}</p>
        </div>
      </div>
    </div>
  )
}

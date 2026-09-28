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
// it becomes a large edge-to-edge stage above the content (capped and
// centered from sm), and the content is pulled up over its faded bottom so
// the eyebrow/title overlap the artwork: Earth → heading → subtitle → form.
export default async function TrackLookupPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.tracking.lookup

  return (
    <div className="relative overflow-x-clip">
      <TrackingHeroArt className="pointer-events-none absolute inset-0 hidden lg:block" />

      <TrackingHeroArt variant="compact" className="w-full sm:mx-auto sm:max-w-[36rem] lg:hidden" />

      {/* Negative top margin below lg = the heading overlap. It lands on the
          stage's fully faded bottom band, so the text reads on plain page
          background; later in the DOM + relative, so it paints above. */}
      <div className="relative mx-auto -mt-14 w-full max-w-md px-4 pb-12 sm:-mt-20 sm:pb-16 lg:mt-0 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-20">
        <div>
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              <span className="h-px w-6 bg-accent/60" aria-hidden="true" />
              {t.eyebrow}
            </span>
            <h1 className="mt-3 flex items-center gap-3 text-2xl font-bold tracking-tight min-[360px]:text-3xl">
              <RouteIcon className="h-7 w-7 shrink-0 text-accent sm:h-8 sm:w-8" />
              {t.title}
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="mt-6 sm:mt-8">
            <TrackLookupForm dict={dict} />
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground lg:text-left">{t.helpText}</p>
        </div>
      </div>
    </div>
  )
}

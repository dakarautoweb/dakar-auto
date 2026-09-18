import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { GlobalIcon } from './icons'
import { GlobalRouteOverlay } from './global-route-overlay'

// The approved vehicle-search-dark/light.png are full promotional scenes —
// vehicle, city skyline, and the dotted world-map graphic are already
// baked into the photo, with the left ~40% left empty for copy.
//
// No `background-size: cover` anywhere here on purpose: cover's crop
// amount (and which edge it trims) depends on the panel's own aspect
// ratio, which changes per breakpoint — that mismatch between the image's
// real pixels and the panel's box was exactly what threw the route overlay
// off. Instead, each photo renders as a real <img> (width 100%, height
// auto), and its wrapper is sized purely from that intrinsic aspect ratio
// (`absolute inset-0 m-auto h-auto w-full`, vertically auto-centered in
// the taller/shorter outer panel) — so the wrapper's box is always exactly
// the photo's own aspect ratio, at every viewport, full image always
// visible, never cropped. <GlobalRouteOverlay> sits inside that same
// wrapper using that exact photo's real pixel dimensions as its own
// viewBox (see global-route-overlay.tsx) — image and SVG share one
// coordinate system, so a route endpoint is the same literal pixel on the
// photo everywhere.
export function SourceVehicle({ dict }: { dict: Dictionary }) {
  return (
    <section id="source-a-vehicle" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative flex min-h-[22rem] items-center overflow-hidden rounded-3xl border border-accent-gold/25 bg-background shadow-card transition duration-200 hover:border-accent-gold/45 hover:shadow-glow-gold sm:min-h-[26rem] lg:min-h-[28rem]">
          <div className="absolute inset-0 m-auto h-auto w-full opacity-100 transition-opacity duration-500 dark:opacity-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vehicle-search/vehicle-search-light.png" alt="" className="block h-auto w-full" />
            <GlobalRouteOverlay uid="light" viewBoxWidth={1915} viewBoxHeight={821} />
          </div>
          <div className="absolute inset-0 m-auto h-auto w-full opacity-0 transition-opacity duration-500 dark:opacity-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vehicle-search/vehicle-search-dark.png" alt="" className="block h-auto w-full" />
            <GlobalRouteOverlay uid="dark" viewBoxWidth={1916} viewBoxHeight={821} />
          </div>

          <div className="relative max-w-md p-6 sm:p-10 lg:p-14">
            <GlobalIcon className="h-9 w-9 text-accent-gold" />
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{dict.sourceVehicle.title}</h2>
            <p className="mt-3 text-muted-foreground">{dict.sourceVehicle.description}</p>
            <Link href="/source-a-vehicle" className={buttonClasses({ variant: 'gold', size: 'lg', pill: true, className: 'mt-6' })}>
              {dict.sourceVehicle.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

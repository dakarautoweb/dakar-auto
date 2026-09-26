import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { ArrowRightIcon, GlobalIcon } from './icons'
import { GlobalRouteOverlay } from './global-route-overlay'

// The approved vehicle-search-dark/light.png are full promotional scenes —
// vehicle, city skyline, and the dotted world-map graphic are already
// baked into the photo, with the left ~40% left empty for copy.
//
// No `background-size: cover` / `object-fit` anywhere here on purpose:
// each photo renders as a real <img> (width 100%, height auto) inside a
// wrapper sized purely from that intrinsic aspect ratio, and
// <GlobalRouteOverlay> sits inside the same wrapper using that exact
// photo's real pixel dimensions as its viewBox (see
// global-route-overlay.tsx) — image and SVG share one coordinate system,
// so a route endpoint is the same literal pixel on the photo everywhere.
// Never stretched, never cropped vertically.
//
// Two layouts, both built on that rule:
// - Below xl: copy stacks on top, the photo sits below it. The photo
//   wrapper is made wider than the card and shifted left (negative margin,
//   clipped by the card's overflow-hidden), which trims only the empty
//   left side of the scene — the SUV and map stay whole and render much
//   larger than a full-width scaled-down banner would on a phone.
// - xl+: the photo is the full card (its natural aspect ratio sets the
//   card's height) and the copy is layered over its empty left side, both
//   in one grid cell, with a soft left scrim for legibility.
export function SourceVehicle({ dict }: { dict: Dictionary }) {
  return (
    <section id="source-a-vehicle" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-[90rem] px-4 py-14 sm:px-6 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
        <div className="relative grid overflow-hidden rounded-3xl border border-accent-gold/30 bg-card shadow-card-hover transition duration-200 hover:border-accent-gold/50 hover:shadow-glow-gold">
          <div className="relative z-10 p-6 sm:p-10 xl:col-start-1 xl:row-start-1 xl:max-w-[36rem] xl:self-center xl:p-12 2xl:max-w-[40rem] 2xl:p-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              <GlobalIcon className="h-4 w-4" />
              {dict.header.nav.sourceVehicle}
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl xl:text-[2.5rem] xl:leading-[1.1] 2xl:text-5xl">
              {dict.sourceVehicle.title}
            </h2>
            <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">{dict.sourceVehicle.description}</p>
            {/* Single primary action — a short gold rule separates it from
                the copy so the lone button reads as a deliberate close to
                the block rather than a leftover gap. */}
            <span aria-hidden="true" className="mt-7 block h-px w-16 bg-gradient-to-r from-accent-gold to-transparent" />
            <Link
              href="/source-a-vehicle"
              className={buttonClasses({ variant: 'primary', size: 'lg', pill: true, className: 'group/cta mt-7 w-full px-8 shadow-glow sm:w-auto' })}
            >
              {dict.sourceVehicle.cta}
              <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover/cta:translate-x-1" />
            </Link>
          </div>

          <div className="relative xl:col-start-1 xl:row-start-1 xl:self-center">
            <div className="relative -ml-[75%] w-[175%] sm:-ml-[40%] sm:w-[140%] lg:-ml-[25%] lg:w-[125%] xl:ml-0 xl:w-full">
              <div className="relative opacity-100 transition-opacity duration-500 dark:opacity-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/vehicle-search/vehicle-search-light.png" alt="" className="block h-auto w-full" />
                <GlobalRouteOverlay uid="light" viewBoxWidth={1915} viewBoxHeight={821} />
              </div>
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/vehicle-search/vehicle-search-dark.png" alt="" className="block h-auto w-full" />
                <GlobalRouteOverlay uid="dark" viewBoxWidth={1916} viewBoxHeight={821} />
              </div>
            </div>
            {/* Stacked layout: blend the photo's top edge into the card so
                copy and photo read as one panel, not two boxes. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-card to-transparent xl:hidden" />
            {/* Overlay layout: soft left scrim behind the copy only — stops
                before the map and the SUV. */}
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-card/85 via-card/40 to-transparent xl:block dark:from-black/55 dark:via-black/20" />
          </div>
        </div>
      </div>
    </section>
  )
}

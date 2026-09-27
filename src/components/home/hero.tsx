'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VinLookupResult } from '@/src/services/vin/types'
import { identifyVinAction } from '@/src/services/vin/actions'
import { normalizeVin, validateVin } from '@/src/lib/vin'
import { ScanVinModal } from '@/src/components/vehicle-wizard/scan-vin-modal'
import { buttonClasses } from '@/src/components/ui/styles'
import { QUOTE_FOCUS_EVENT, QUOTE_PARAM } from '@/src/lib/quote-cta'
import { HeroVisual } from './hero-visual'
import { HomeHeroPhoto } from './home-hero-photo'
import { HeroVehicleResult } from './hero-vehicle-result'
import { ScanIcon, SearchIcon, LayersIcon, SendIcon, RouteIcon, CarSideIcon, InfoIcon } from './icons'

const FEATURE_ICONS = [SearchIcon, LayersIcon, SendIcon, RouteIcon]
const FEATURE_HREFS = ['/vehicle/identify', '/#parts-categories', '/source-a-vehicle', '/track']

// Where the quote CTA parks the VIN field: this far below the viewport top,
// clearing the sticky header with some breathing room.
const QUOTE_SCROLL_OFFSET = 155
// Below this distance a same-page scroll would be imperceptible…
const QUOTE_MIN_SCROLL = 50
// …so the page is first offset by this much, then smooth-scrolls back.
const QUOTE_NUDGE = 70
// Staged reveal: focus lands once the smooth scroll has mostly settled,
// then the hint follows a beat later.
const QUOTE_FOCUS_DELAY = 600
const QUOTE_HINT_DELAY = 200
const QUOTE_HINT_DURATION = 8000

// Explicit window scroll rather than scrollIntoView, so the field lands at
// a predictable spot under the header. With `nudge`, a click that would
// barely move the page (field already in place) still produces a short,
// visible glide into position so the CTA feels like it did something.
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollVinIntoPlace(input: HTMLInputElement, nudge: boolean) {
  const maxY = document.documentElement.scrollHeight - window.innerHeight
  const target = Math.min(maxY, Math.max(0, window.scrollY + input.getBoundingClientRect().top - QUOTE_SCROLL_OFFSET))
  const reducedMotion = prefersReducedMotion()

  if (nudge && !reducedMotion && Math.abs(target - window.scrollY) < QUOTE_MIN_SCROLL) {
    // Start just above the target so the glide runs downward, toward the
    // form; fall back to just below it when already at the top of the page.
    const start = target - QUOTE_NUDGE >= 0 ? target - QUOTE_NUDGE : Math.min(maxY, target + QUOTE_NUDGE)
    // 'instant' overrides the global `scroll-behavior: smooth` on <html>.
    window.scrollTo({ top: start, behavior: 'instant' })
  }
  window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' })
}

export function Hero({ dict }: { dict: Dictionary }) {
  const features = [dict.hero.features.identify, dict.hero.features.browse, dict.hero.features.submit, dict.hero.features.track]

  const router = useRouter()
  const [vin, setVin] = useState('')
  const [result, setResult] = useState<VinLookupResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [scanOpen, setScanOpen] = useState(false)
  const [showQuoteHint, setShowQuoteHint] = useState(false)
  const vinInputRef = useRef<HTMLInputElement>(null)
  // Pending quote-CTA timers (focus, hint reveal, hint auto-hide). Mutated
  // in place so the effect cleanup and hideQuoteHint share one list.
  const quoteTimersRef = useRef<number[]>([])

  // Typing, pasting or a scanned VIN dismisses the hint immediately — and
  // cancels a still-pending reveal so it can't pop up afterwards.
  function hideQuoteHint() {
    quoteTimersRef.current.splice(0).forEach((id) => window.clearTimeout(id))
    setShowQuoteHint(false)
  }

  // "Demander un devis" (header / mobile menu, see src/lib/quote-cta.ts):
  // scroll the VIN field to just under the header, then (staged) focus it
  // with the caret at the end and show a floating hint below it for at most
  // 8s. Triggered either by the ?quote=1 signal on arrival from another
  // route (read once, then removed from the URL) or by the same-page window
  // event. Focus is taken once per CTA click — never re-grabbed afterwards.
  useEffect(() => {
    const timers = quoteTimersRef.current
    const clearTimers = () => timers.splice(0).forEach((id) => window.clearTimeout(id))

    function focusVinForQuote({ nudge }: { nudge: boolean }) {
      const input = vinInputRef.current
      if (!input) {
        // A decoded vehicle is on screen (no VIN field) — just bring the
        // request panel into view rather than discarding the user's result.
        document.getElementById('hero-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      clearTimers()
      setShowQuoteHint(false)
      scrollVinIntoPlace(input, nudge)
      // Reduced motion: the scroll is instant, so there's nothing to wait for.
      const reducedMotion = prefersReducedMotion()
      const focusDelay = reducedMotion ? 0 : QUOTE_FOCUS_DELAY
      const hintDelay = reducedMotion ? 0 : QUOTE_HINT_DELAY
      timers.push(
        window.setTimeout(() => {
          // preventScroll: the browser's own focus scroll would fight the
          // explicit scroll above.
          input.focus({ preventScroll: true })
          input.setSelectionRange(input.value.length, input.value.length)
          timers.push(
            window.setTimeout(() => {
              setShowQuoteHint(true)
              timers.push(window.setTimeout(() => setShowQuoteHint(false), QUOTE_HINT_DURATION))
            }, hintDelay),
          )
        }, focusDelay),
      )
    }

    // Same-page click: nothing else moves the page, so always make the
    // scroll visible. Arrival from another route already involves a page
    // change, so no nudge there.
    const onQuoteFocus = () => focusVinForQuote({ nudge: true })
    window.addEventListener(QUOTE_FOCUS_EVENT, onQuoteFocus)

    let frame: number | undefined
    const params = new URLSearchParams(window.location.search)
    if (params.get(QUOTE_PARAM) === '1') {
      params.delete(QUOTE_PARAM)
      const query = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
      // Next frame: lets the router finish its own #hero-request hash
      // scroll first, so this smooth scroll is the one that sticks.
      frame = window.requestAnimationFrame(() => focusVinForQuote({ nudge: false }))
    }

    return () => {
      window.removeEventListener(QUOTE_FOCUS_EVENT, onQuoteFocus)
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      clearTimers()
    }
  }, [])

  const validationError = vin.length > 0 ? validateVin(vin) : null
  const canSubmit = vin.length === 17 && validationError === null && !isPending
  const found = result?.status === 'found' ? result.vehicle : null

  function runLookup(value: string) {
    startTransition(async () => {
      const lookup = await identifyVinAction(value)
      setResult(lookup)
    })
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    runLookup(vin)
  }

  return (
    <section id="hero" className="relative overflow-hidden">
      <HomeHeroPhoto />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/40 to-transparent" />

      <div className="mx-auto max-w-[90rem] px-4 pt-8 pb-10 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12 xl:px-14 2xl:px-20">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.15fr] lg:items-center lg:gap-10">
        <div className={found ? 'lg:col-span-2' : undefined}>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            {dict.hero.label}
          </span>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.75rem] lg:leading-[1.03]">
            {dict.hero.headlineStart}
            <span className="text-accent">{dict.hero.headlineHighlight}</span>
            {dict.hero.headlineEnd}
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted-foreground">{dict.hero.description}</p>

          {found ? (
            <div id="hero-request" className="mt-7 scroll-mt-24">
              <HeroVehicleResult
                vehicle={found}
                dict={dict}
                onEditVin={() => setResult(null)}
                onReset={() => {
                  setResult(null)
                  setVin('')
                }}
              />
            </div>
          ) : (
            <div id="hero-request" className="mt-7 max-w-xl scroll-mt-24 rounded-2xl border border-border bg-card/95 p-5 shadow-card sm:p-6">
              <form onSubmit={handleSubmit}>
                <label htmlFor="vin" className="mb-2 block text-sm font-medium text-muted-foreground">
                  {dict.hero.vinLabel}
                </label>
                <div className="flex flex-col sm:flex-row">
                  <div className="relative sm:flex-1">
                    <CarSideIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={vinInputRef}
                      id="vin"
                      value={vin}
                      aria-describedby={showQuoteHint ? 'vin-quote-hint' : undefined}
                      onChange={(event) => {
                        setVin(normalizeVin(event.target.value).slice(0, 17))
                        setResult(null)
                        hideQuoteHint()
                      }}
                      maxLength={17}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder={dict.hero.vinPlaceholder}
                      className="w-full rounded-xl border border-border bg-surface py-4 pr-4 pl-11 font-mono text-foreground uppercase tracking-widest shadow-sm transition duration-200 placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-4 focus:ring-accent/20"
                    />
                    {/* Quote-CTA hint — a floating popover anchored to the
                        field's wrapper: absolutely positioned 10px below the
                        input (so it never covers it), left-aligned with the
                        caret pointing up at it, and out of flow so nothing
                        around it moves. Width is capped by the field's own
                        width and the viewport, so it can't clip on mobile.
                        Always white with dark text, in both themes. The live
                        region stays mounted so the text is announced when it
                        appears. */}
                    <div role="status" aria-live="polite" className="absolute inset-x-0 top-full z-30 mt-2.5">
                      {showQuoteHint && (
                        <div
                          id="vin-quote-hint"
                          className="relative w-max max-w-[min(20rem,100%,calc(100vw_-_32px))] animate-[popover-in_220ms_ease-out_both] rounded-xl border border-neutral-200 bg-white p-3 pr-4 text-neutral-900 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28),0_2px_6px_rgba(15,23,42,0.08)]"
                        >
                          <span aria-hidden="true" className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 rounded-tl-[2px] border-t border-l border-neutral-200 bg-white" />
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-accent">
                              <InfoIcon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-neutral-900">{dict.hero.quoteHintTitle}</p>
                              <p className="mt-0.5 text-xs leading-snug text-neutral-600">{dict.hero.quoteHintDescription}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={buttonClasses({ variant: 'primary', size: 'lg', className: 'mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto' })}
                  >
                    {isPending ? dict.wizard.vin.loading : dict.hero.primaryCta}
                  </button>
                </div>

                {validationError && (
                  <p className="mt-2 text-sm text-red-500">{validationError === 'length' ? dict.wizard.vin.errorLength : dict.wizard.vin.errorCharacters}</p>
                )}

                {result?.status === 'partial' && (
                  // Informational, not an error — the VIN was read, it just
                  // didn't yield every detail. The wizard re-runs this
                  // (cached) lookup from ?vin= and opens manual selection
                  // with the make already filled in.
                  <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-soft/40 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <InfoIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{dict.wizard.vin.partialTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{dict.wizard.vin.partialDescription}</p>
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">{dict.wizard.manual.makeLabel} : </span>
                        <span className="font-semibold text-foreground">{result.vehicle.make}</span>
                      </p>
                      <Link
                        href={`/vehicle/identify?vin=${encodeURIComponent(result.vehicle.vin)}`}
                        className={buttonClasses({ variant: 'primary', size: 'md', className: 'mt-3' })}
                      >
                        {dict.wizard.vin.partialCta}
                      </Link>
                    </div>
                  </div>
                )}

                {(result?.status === 'not_found' || result?.status === 'unavailable') && (
                  <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                    <p className="font-medium">{result.status === 'not_found' ? dict.wizard.vin.notFoundTitle : dict.wizard.vin.unavailableTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.status === 'not_found' ? dict.wizard.vin.notFoundDescription : dict.wizard.vin.unavailableDescription}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => canSubmit && runLookup(vin)}
                        disabled={!canSubmit}
                        className={buttonClasses({ variant: 'secondary', size: 'md' })}
                      >
                        {dict.wizard.vin.retry}
                      </button>
                      <Link href="/vehicle/identify?manual=1" className={buttonClasses({ variant: 'primary', size: 'md' })}>
                        {dict.wizard.vin.manualCta}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <button type="button" onClick={() => setScanOpen(true)} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
                    <ScanIcon className="h-[18px] w-[18px]" />
                    {dict.hero.secondaryCta}
                  </button>

                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 marker:content-none transition duration-200 hover:text-accent hover:underline">
                      <InfoIcon className="h-4 w-4" />
                      {dict.hero.helpLink}
                    </summary>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">{dict.hero.helpText}</p>
                  </details>
                </div>
              </form>
            </div>
          )}

          {/* Feature strip — the four things a visitor can do from here.
              A real 3-row internal grid (icon / title / description),
              centered content, and reserved min-heights on the title and
              description rows keep every card's icon, heading, and text
              aligned even when one label wraps and another doesn't. No
              icon capsule — just a bare, large glyph. Hover is subtle
              only: border/shadow shift, no lift. */}
          <ul className="mt-8 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4">
            {features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <li key={feature.title} className="flex">
                  <Link
                    href={FEATURE_HREFS[i]}
                    className="group grid h-full w-full grid-rows-[auto_auto_1fr] justify-items-center gap-2 rounded-2xl border border-border bg-card/70 p-4 text-center shadow-card transition duration-200 hover:border-accent/40 hover:bg-card hover:shadow-card-hover"
                  >
                    <Icon className="h-10 w-10 text-accent transition duration-200 group-hover:scale-105 sm:h-11 sm:w-11 lg:h-12 lg:w-12" />
                    <span className="flex min-h-[2.5rem] items-center text-sm leading-tight font-semibold">{feature.title}</span>
                    <span className="block min-h-[2rem] text-xs leading-snug text-muted-foreground">{feature.description}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {!found && (
          // Idle-state placeholder (imageUrl is always null here — it's
          // only ever filled once a VIN resolves, which swaps this whole
          // branch for <HeroVehicleResult> instead) exists to balance
          // desktop's 2-column grid. Below lg the layout is a single
          // stacked column, so this decorative block is hidden there
          // entirely (no wrapper div left behind to create an empty
          // grid-gap gap) rather than shown. The former secondary "Need a
          // complete vehicle?" nudge that lived alongside it was removed —
          // it duplicated the full SourceVehicle homepage section further
          // down the page, most visible on mobile where both used to stack.
          <div className="hidden lg:block">
            <HeroVisual imageUrl={null} caption={dict.hero.caption} />
          </div>
        )}
        </div>
      </div>

      {scanOpen && (
        <ScanVinModal
          dict={dict}
          onClose={() => setScanOpen(false)}
          onManual={() => router.push('/vehicle/identify')}
          onVinDetected={(detectedVin) => {
            setVin(normalizeVin(detectedVin))
            setResult(null)
            hideQuoteHint()
            setScanOpen(false)
          }}
        />
      )}
    </section>
  )
}

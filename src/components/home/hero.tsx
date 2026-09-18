'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VinLookupResult } from '@/src/services/vin/types'
import { identifyVinAction } from '@/src/services/vin/actions'
import { normalizeVin, validateVin } from '@/src/lib/vin'
import { ScanVinModal } from '@/src/components/vehicle-wizard/scan-vin-modal'
import { buttonClasses } from '@/src/components/ui/styles'
import { HeroVisual } from './hero-visual'
import { HomeHeroPhoto } from './home-hero-photo'
import { HeroVehicleResult } from './hero-vehicle-result'
import { ScanIcon, SearchIcon, LayersIcon, SendIcon, RouteIcon, CarSideIcon, InfoIcon } from './icons'

const FEATURE_ICONS = [SearchIcon, LayersIcon, SendIcon, RouteIcon]
const FEATURE_HREFS = ['/vehicle/identify', '/#parts-categories', '/source-a-vehicle', '/track']

export function Hero({ dict }: { dict: Dictionary }) {
  const features = [dict.hero.features.identify, dict.hero.features.browse, dict.hero.features.submit, dict.hero.features.track]

  const router = useRouter()
  const [vin, setVin] = useState('')
  const [result, setResult] = useState<VinLookupResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [scanOpen, setScanOpen] = useState(false)

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
    <section id="hero" className="relative overflow-hidden border-b border-border">
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
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative sm:flex-1">
                    <CarSideIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="vin"
                      value={vin}
                      onChange={(event) => {
                        setVin(normalizeVin(event.target.value).slice(0, 17))
                        setResult(null)
                      }}
                      maxLength={17}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder={dict.hero.vinPlaceholder}
                      className="w-full rounded-xl border border-border bg-surface py-4 pr-4 pl-11 font-mono text-foreground uppercase tracking-widest shadow-sm transition duration-200 placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-4 focus:ring-accent/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}
                  >
                    {isPending ? dict.wizard.vin.loading : dict.hero.primaryCta}
                  </button>
                </div>

                {validationError && (
                  <p className="mt-2 text-sm text-red-500">{validationError === 'length' ? dict.wizard.vin.errorLength : dict.wizard.vin.errorCharacters}</p>
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
          <div className="flex flex-col gap-5">
            {/* Idle-state placeholder (imageUrl is always null here — it's
                only ever filled once a VIN resolves, which swaps this
                whole branch for <HeroVehicleResult> instead) exists to
                balance desktop's 2-column grid. Below lg the layout is a
                single stacked column, so this decorative block just left
                a large empty gap between the feature cards and the CTA
                nudge below — hidden there, unchanged at lg+. */}
            <div className="hidden lg:block">
              <HeroVisual imageUrl={null} caption={dict.hero.caption} />
            </div>

            {/* Secondary premium nudge — distinct from the full SourceVehicle
                homepage section further down; a compact reminder, not a duplicate. */}
            <Link
              href="/source-a-vehicle"
              className="group flex flex-col items-stretch gap-3 rounded-2xl border border-accent-gold/25 bg-accent-gold-soft px-5 py-4 transition duration-200 hover:border-accent-gold/50 hover:shadow-glow-gold sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span>
                <span className="block text-sm font-semibold text-accent-gold-foreground dark:text-accent-gold">{dict.hero.vehiclePanel.title}</span>
                <span className="block text-xs text-muted-foreground">{dict.hero.vehiclePanel.description}</span>
              </span>
              <span className={buttonClasses({ variant: 'gold', size: 'sm', pill: true, fullWidth: true, className: 'shrink-0 sm:w-auto' })}>
                {dict.hero.vehiclePanel.cta}
              </span>
            </Link>
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
            setScanOpen(false)
          }}
        />
      )}
    </section>
  )
}

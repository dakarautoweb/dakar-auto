import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { HeroVisual } from './hero-visual'
import { ScanIcon } from './icons'

export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section id="hero" className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent-soft to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-semibold tracking-widest text-accent">
            {dict.hero.label}
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {dict.hero.headlineStart}
            <span className="text-accent">{dict.hero.headlineHighlight}</span>
            {dict.hero.headlineEnd}
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{dict.hero.description}</p>

          <div className="mt-8 max-w-xl rounded-2xl border border-border bg-surface/70 p-5 shadow-lg shadow-black/[0.04] backdrop-blur-sm sm:p-6 dark:shadow-black/20">
            <form id="hero-request" action="/vehicle/identify" method="GET" className="scroll-mt-24">
              <label htmlFor="vin" className="mb-2 block text-sm font-medium text-muted-foreground">
                {dict.hero.vinLabel}
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="vin"
                  name="vin"
                  type="text"
                  maxLength={17}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={dict.hero.vinPlaceholder}
                  className="w-full rounded-xl border border-border bg-background px-4 py-4 font-mono uppercase tracking-widest text-foreground shadow-sm placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 sm:flex-1"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-7 py-4 text-base font-semibold whitespace-nowrap text-accent-foreground shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/35"
                >
                  {dict.hero.primaryCta}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href="/vehicle/identify?scan=1"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-medium text-foreground transition hover:border-accent hover:text-accent"
                >
                  <ScanIcon className="h-4 w-4" />
                  {dict.hero.secondaryCta}
                </Link>

                <details className="group">
                  <summary className="cursor-pointer list-none font-medium text-accent underline-offset-4 marker:content-none hover:underline">
                    {dict.hero.helpLink}
                  </summary>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">{dict.hero.helpText}</p>
                </details>
              </div>
            </form>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}

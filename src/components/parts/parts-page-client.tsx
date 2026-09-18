'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { HeroBackdrop } from '@/src/components/home/hero-backdrop'
import { TrustIcon } from '@/src/components/home/icons'
import { Brands } from '@/src/components/home/brands'
import { SourceVehicle } from '@/src/components/home/source-vehicle'
import { Reveal } from '@/src/components/reveal'
import { iconCircleClasses } from '@/src/components/ui/styles'
import { PartsHeroVisual } from './parts-hero-visual'
import { PartsHeroBackdrop } from './parts-hero-backdrop'
import { PartsBrowser } from './parts-browser'
import { PartsNotFoundCta } from './not-found-cta'

// Owns the single shared "active category" state so the top hero's
// imagery and the sidebar/grid below stay in sync — see parts-browser.tsx
// and parts-hero-visual.tsx.
export function PartsPageClient({ dict }: { dict: Dictionary }) {
  const t = dict.partsPage
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const activeCategoryData = activeCategory ? dict.categories.items.find((c) => c.key === activeCategory) : null

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border">
        <HeroBackdrop position="center" />
        <PartsHeroBackdrop position="center right" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/75 to-background/40" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="transition duration-200 hover:text-accent">
              {t.breadcrumbHome}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-foreground">{t.breadcrumbParts}</span>
            {activeCategoryData && (
              <>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-accent">{activeCategoryData.title}</span>
              </>
            )}
          </nav>

          <div className="mt-3 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div key={activeCategoryData?.key ?? 'all'} className="animate-[fade-in_250ms_ease-out]">
              <span className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t.eyebrow}</span>
              <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                {activeCategoryData ? (
                  activeCategoryData.title
                ) : (
                  <>
                    {t.title} <span className="text-accent">{t.titleHighlight}</span>
                  </>
                )}
              </h1>
              <p className="mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
                {activeCategoryData ? activeCategoryData.description : t.description}
              </p>

              <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:w-auto">
                {dict.trust.items.map((item, i) => (
                  <li key={item.title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                    <span className={iconCircleClasses({ size: 'md', tone: 'blue' })}>
                      <TrustIcon index={i} className="h-6 w-6" />
                    </span>
                    <span className="text-sm font-semibold leading-snug">{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Real category renders stand in for a fabricated composite —
                reacts to the active category (see parts-hero-visual.tsx). */}
            <PartsHeroVisual activeCategory={activeCategory} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PartsBrowser dict={dict} activeCategory={activeCategory} onActiveCategoryChange={setActiveCategory} />
        <div className="mt-8">
          <PartsNotFoundCta dict={dict} />
        </div>
      </div>

      <Reveal>
        <Brands dict={dict} />
      </Reveal>
      <Reveal>
        <SourceVehicle dict={dict} />
      </Reveal>
    </div>
  )
}

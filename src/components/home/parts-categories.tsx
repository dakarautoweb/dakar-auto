import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { Reveal } from '@/src/components/reveal'
import { SectionHeading } from './section-heading'
import { BrakeDiscArt, ArrowRightIcon } from './icons'
import { PART_CATEGORY_IMAGES, type PartCategoryKey } from '@/src/lib/parts-catalog'
import { CategoryImage } from '@/src/components/parts/category-image'

// Real product renders (public/parts/categories/*.webp) are isolated parts
// on a transparent background, not full-bleed photos — object-contain on a
// dark metallic card, not object-cover, is what makes them read as premium
// product shots instead of stretched/cropped thumbnails.
export function PartsCategories({ dict }: { dict: Dictionary }) {
  return (
    <section id="parts-categories" className="scroll-mt-20 relative overflow-hidden border-b border-border">
      <BrakeDiscArt className="pointer-events-none absolute -top-10 -right-10 hidden h-72 w-72 text-foreground/[0.035] lg:block" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={dict.categories.eyebrow} title={dict.categories.title} description={dict.categories.description} />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {dict.categories.items.map((cat, i) => (
            <Reveal key={cat.key} delayMs={Math.min(i, 6) * 50}>
              <Link
                href="/vehicle/identify"
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-raised to-surface p-3.5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-hover hover:shadow-glow focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent opacity-0 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100">
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="relative mt-1 aspect-square w-full">
                  <div className="absolute inset-0 rounded-xl bg-accent/10 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
                  <CategoryImage
                    src={PART_CATEGORY_IMAGES[cat.key as PartCategoryKey]}
                    alt={cat.title}
                    className="relative h-full w-full object-contain drop-shadow-xl transition duration-300 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="mt-1">
                  <h3 className="text-sm font-semibold sm:text-base">{cat.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-lg font-semibold">{dict.categories.cantFind.title}</h3>
          <p className="text-muted-foreground">{dict.categories.cantFind.description}</p>
          <Link href="/vehicle/identify" className={buttonClasses({ variant: 'primary', pill: true, className: 'mt-2' })}>
            {dict.categories.cantFind.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}

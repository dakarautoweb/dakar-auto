'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { Reveal } from '@/src/components/reveal'
import { PART_CATEGORY_IMAGES, PART_SUBCATEGORY_KEYS, type PartCategoryKey } from '@/src/lib/parts-catalog'
import { ArrowRightIcon, CategoryIcon, LayersIcon, SearchIcon, SubcategoryIcon } from '@/src/components/home/icons'
import { usePartRequestWizard } from '@/src/components/vehicle-wizard/wizard-context'
import { CategoryImage } from './category-image'

const TOTAL_SUBCATEGORY_COUNT = Object.values(PART_SUBCATEGORY_KEYS).reduce((sum, keys) => sum + keys.length, 0)

// Client-side browse + search over the real category/subcategory data
// (src/lib/parts-catalog.ts + dictionary copy) — there is no parts SKU
// catalog to query, so this filters the same structured data the request
// wizard already uses rather than fabricating counts or search results.
// Every subcategory tile leads to /vehicle/identify, having first recorded
// its category + part in the shared wizard context (see SubcategoryTile
// below) so the wizard can skip straight to Part Details once a vehicle is
// identified, instead of asking the user to choose a category/part again.
//
// activeCategory is controlled by the parent (parts-page-client.tsx) —
// the same selection also drives the top hero's category-reactive image,
// so both live in one shared piece of state instead of two.
export function PartsBrowser({
  dict,
  activeCategory,
  onActiveCategoryChange,
}: {
  dict: Dictionary
  activeCategory: string | null
  onActiveCategoryChange: (key: string | null) => void
}) {
  const t = dict.partsPage
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null
    const results: { categoryKey: string; categoryTitle: string; key: string; title: string }[] = []
    for (const cat of dict.categories.items) {
      for (const sub of cat.subcategories) {
        if (sub.title.toLowerCase().includes(normalizedQuery) || cat.title.toLowerCase().includes(normalizedQuery)) {
          results.push({ categoryKey: cat.key, categoryTitle: cat.title, key: sub.key, title: sub.title })
        }
      }
    }
    return results
  }, [normalizedQuery, dict.categories.items])

  const activeCategoryData = activeCategory ? dict.categories.items.find((c) => c.key === activeCategory) : null
  const activeSubcategoryKeys = activeCategory ? (PART_SUBCATEGORY_KEYS[activeCategory as PartCategoryKey] ?? []) : []

  function selectCategory(key: string | null) {
    onActiveCategoryChange(key)
    setQuery('')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start lg:gap-8">
      {/* Sidebar */}
      <aside className="rounded-2xl border border-border bg-card p-3 shadow-card lg:sticky lg:top-20">
        <h2 className="px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t.sidebarTitle}</h2>
        <nav className="mt-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => selectCategory(null)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition duration-200 ${
              activeCategory === null ? 'bg-accent text-accent-foreground shadow-glow' : 'hover:bg-surface hover:text-accent'
            }`}
          >
            <LayersIcon className="h-6 w-6 shrink-0" />
            <span className="flex-1">{t.allParts}</span>
            <span
              className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold ${activeCategory === null ? 'bg-white/20 text-accent-foreground' : 'bg-surface text-muted-foreground'}`}
            >
              {TOTAL_SUBCATEGORY_COUNT}
            </span>
          </button>

          {dict.categories.items.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => selectCategory(cat.key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition duration-200 ${
                activeCategory === cat.key ? 'bg-accent text-accent-foreground shadow-glow' : 'hover:bg-surface hover:text-accent'
              }`}
            >
              <CategoryIcon name={cat.key} className="h-6 w-6 shrink-0" />
              <span className="flex-1 truncate">{cat.title}</span>
              <span
                className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold ${activeCategory === cat.key ? 'bg-white/20 text-accent-foreground' : 'bg-surface text-muted-foreground'}`}
              >
                {cat.subcategories.length}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Search + grid */}
      <div>
        <form role="search" onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-border bg-card py-4 pr-4 pl-12 text-sm shadow-card transition duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button type="submit" className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}>
            {t.searchCta}
          </button>
        </form>

        {searchResults ? (
          searchResults.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {searchResults.map((result, i) => (
                <Reveal key={`${result.categoryKey}-${result.key}`} className="h-full" delayMs={Math.min(i, 8) * 35}>
                  <SubcategoryTile categoryKey={result.categoryKey} subKey={result.key} title={result.title} categoryTitle={result.categoryTitle} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground">{t.searchEmpty}</p>
          )
        ) : activeCategoryData ? (
          <div key={activeCategoryData.key} className="animate-[fade-in_250ms_ease-out]">
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-accent"
            >
              <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
              {t.backToCategories}
            </button>
            <h2 className="mt-3 text-lg font-semibold">{activeCategoryData.title}</h2>
            <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {activeSubcategoryKeys.map((key, i) => {
                const sub = activeCategoryData.subcategories.find((s) => s.key === key)
                if (!sub) return null
                return (
                  <Reveal key={key} className="h-full" delayMs={Math.min(i, 8) * 35}>
                    <SubcategoryTile categoryKey={activeCategoryData.key} subKey={key} title={sub.title} />
                  </Reveal>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {dict.categories.items.map((cat, i) => (
              <Reveal key={cat.key} delayMs={Math.min(i, 6) * 40}>
                <Link
                  href="/vehicle/identify"
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-raised to-surface p-3.5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-hover hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-xs text-muted-foreground">{cat.subcategories.length}</span>
                  </div>
                  <div className="relative mt-1 aspect-square w-full">
                    <div className="absolute inset-0 rounded-xl bg-accent/10 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
                    <CategoryImage
                      src={PART_CATEGORY_IMAGES[cat.key as PartCategoryKey]}
                      alt={cat.title}
                      className="relative h-full w-full object-contain drop-shadow-xl transition duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{cat.title}</h3>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-accent">
                        {t.viewParts}
                        <ArrowRightIcon className="h-3 w-3 transition duration-200 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// `h-full` (with the grid's default stretch on its <Reveal> wrapper) plus
// a fixed icon zone and a 2-line-clamped label keep every tile the exact
// same height regardless of how long its title is — no card taller or
// shorter than its neighbors just because one label wraps.
//
// Picking a tile here is the Pièces ("part-first") entry point into the
// shared part-request wizard (see wizard-context.tsx) — it records the
// category + this specific part in the shared context before navigating,
// so /vehicle/identify can skip straight back to Part Details with this
// part prefilled once the vehicle is identified, instead of asking the
// user to pick a category and part all over again.
function SubcategoryTile({ categoryKey, subKey, title, categoryTitle }: { categoryKey: string; subKey: string; title: string; categoryTitle?: string }) {
  const wizard = usePartRequestWizard()

  return (
    <Link
      href="/vehicle/identify"
      onClick={() => wizard.selectPart(categoryKey, { key: subKey, label: title })}
      className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-hover hover:shadow-glow"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        {/* The icon keeps its own baked-in multi-tone colors (orange
            accent, gray/dark-gray surfaces) — hover only nudges scale
            and brightness, it never recolors the artwork. Selection/
            hover on the card itself is signaled by the border/shadow
            classes on the parent <Link>. */}
        <SubcategoryIcon
          name={subKey}
          className="h-12 w-12 transition duration-200 group-hover:scale-110 group-hover:brightness-110 group-hover:drop-shadow-[0_0_12px_rgba(255,107,11,0.35)]"
        />
      </span>
      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <span className="line-clamp-2 text-sm font-semibold transition duration-200 group-hover:text-accent">{title}</span>
        {categoryTitle && <span className="text-xs text-muted-foreground">{categoryTitle}</span>}
      </div>
    </Link>
  )
}

import type { Dictionary } from '@/src/i18n/dictionaries'
import { PART_CATEGORY_IMAGES, type PartCategoryKey } from '@/src/lib/parts-catalog'
import { ArrowRightIcon, CheckCircleIcon, RequestToolIcon } from '@/src/components/home/icons'
import { CategoryImage } from '@/src/components/parts/category-image'

// Same dense, product-shot grid as the homepage category section (see
// src/components/home/parts-categories.tsx) — real renders are isolated
// parts on transparent backgrounds, so object-contain on a dark card, not
// object-cover, is what makes them read as premium product photography.
export function CategoryStep({
  dict,
  selectedCategory,
  onSelect,
  onBack,
}: {
  dict: Dictionary
  selectedCategory?: string | null
  onSelect: (category: string) => void
  // Only passed when there's a vehicle step to return to (see wizard.tsx) —
  // omitted, this renders exactly as before.
  onBack?: () => void
}) {
  return (
    <div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {dict.wizard.parts.backToVehicle}
        </button>
      )}
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.parts.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.parts.description}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {dict.categories.items.map((cat, i) => {
          const isSelected = cat.key === selectedCategory
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect(cat.key)}
              aria-pressed={isSelected}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-surface-raised to-surface p-3.5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none sm:p-4 ${
                isSelected ? 'border-accent ring-2 ring-accent/60' : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                {isSelected ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent opacity-0 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100">
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </span>
                )}
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
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect('other')}
        aria-pressed={selectedCategory === 'other'}
        className={`group mt-4 flex w-full flex-col gap-6 rounded-3xl border bg-card p-6 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none sm:mt-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8 ${
          selectedCategory === 'other' ? 'border-accent ring-2 ring-accent/60' : 'border-accent/30 hover:border-accent/50'
        }`}
      >
        <div className="flex items-center gap-5 sm:flex-1">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <RequestToolIcon className="h-8 w-8" />
          </span>
          <span className="hidden h-14 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.categories.cantFind.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{dict.categories.cantFind.description}</p>
          </div>
        </div>
        <span className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-accent px-8 text-base font-semibold text-accent transition duration-200 group-hover:bg-accent group-hover:text-accent-foreground">
          {dict.categories.cantFind.cta}
          <ArrowRightIcon className="h-5 w-5" />
        </span>
      </button>
    </div>
  )
}

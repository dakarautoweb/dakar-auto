import type { Dictionary } from '@/src/i18n/dictionaries'
import { OtherPartIcon, SubcategoryIcon } from '@/src/components/home/icons'
import { OTHER_KEY, PART_SUBCATEGORY_KEYS, type PartCategoryKey } from '@/src/lib/parts-catalog'

export function SubcategoryStep({
  dict,
  category,
  selectedSubcategory,
  onSelect,
  onBack,
}: {
  dict: Dictionary
  category: string
  // Subcategory key of the currently-drafted part, or OTHER_KEY once the
  // user picked "Other" — used only to highlight the matching tile, so a
  // free-text edit made afterwards in PartDetailsStep doesn't fight it.
  selectedSubcategory?: string | null
  onSelect: (subcategory: { key: string; label: string }) => void
  onBack: () => void
}) {
  const categoryDict = dict.categories.items.find((c) => c.key === category)
  const subcategoryKeys = PART_SUBCATEGORY_KEYS[category as PartCategoryKey] ?? []
  const subcategories = subcategoryKeys
    .map((key) => ({ key, title: categoryDict?.subcategories.find((s) => s.key === key)?.title }))
    .filter((s): s is { key: string; title: string } => Boolean(s.title))

  return (
    <div className="animate-[fade-in_200ms_ease-out]">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {dict.wizard.parts.changeCategory}
      </button>

      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.parts.subcategoryTitle}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.parts.subcategoryDescription}</p>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {subcategories.map((sub) => {
          const isSelected = sub.key === selectedSubcategory
          return (
            <button
              key={sub.key}
              type="button"
              onClick={() => onSelect({ key: sub.key, label: sub.title })}
              aria-pressed={isSelected}
              className={`group flex min-h-[122px] flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-4 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none ${
                isSelected ? 'border-accent ring-2 ring-accent/50' : 'border-border hover:border-accent/40'
              }`}
            >
              <SubcategoryIcon name={sub.key} className="h-11 w-11 shrink-0 transition duration-200 group-hover:scale-110" />
              <span className="text-xs leading-snug font-medium break-words">{sub.title}</span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onSelect({ key: OTHER_KEY, label: '' })}
          aria-pressed={selectedSubcategory === OTHER_KEY}
          className={`group flex min-h-[122px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card p-4 text-center transition duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none ${
            selectedSubcategory === OTHER_KEY ? 'border-accent bg-accent-soft ring-2 ring-accent/50' : 'border-border hover:border-accent/40'
          }`}
        >
          <OtherPartIcon className="h-11 w-11 shrink-0 text-accent transition duration-200 group-hover:scale-110" />
          <span className="text-xs leading-snug font-medium">{dict.categories.cantFind.title}</span>
        </button>
      </div>
    </div>
  )
}

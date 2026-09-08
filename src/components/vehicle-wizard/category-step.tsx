import type { Dictionary } from '@/src/i18n/dictionaries'
import { CategoryIcon, OtherIcon } from '@/src/components/home/icons'

export function CategoryStep({
  dict,
  selectedCategory,
  onSelect,
}: {
  dict: Dictionary
  selectedCategory?: string | null
  onSelect: (category: string) => void
}) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.parts.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.parts.description}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dict.categories.items.map((cat) => {
          const isSelected = cat.key === selectedCategory
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect(cat.key)}
              aria-pressed={isSelected}
              className={`group flex items-start gap-4 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none ${
                isSelected ? 'border-accent bg-accent-soft' : 'border-border bg-surface/60 hover:border-accent/40'
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
                <CategoryIcon name={cat.key} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold">{cat.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{cat.description}</span>
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onSelect('other')}
          aria-pressed={selectedCategory === 'other'}
          className={`group flex items-start gap-4 rounded-2xl border border-dashed p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none ${
            selectedCategory === 'other' ? 'border-accent bg-accent-soft' : 'border-border bg-surface/60 hover:border-accent/40'
          }`}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
            <OtherIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">{dict.categories.cantFind.title}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{dict.categories.cantFind.description}</span>
          </span>
        </button>
      </div>
    </div>
  )
}

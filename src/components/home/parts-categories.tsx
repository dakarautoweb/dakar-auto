import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'
import { CategoryIcon } from './icons'

export function PartsCategories({ dict }: { dict: Dictionary }) {
  return (
    <section id="parts-categories" className="scroll-mt-20 border-b border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title={dict.categories.title} description={dict.categories.description} />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {dict.categories.items.map((cat) => (
            <div
              key={cat.key}
              className="group rounded-2xl border border-border bg-background p-6 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
                <CategoryIcon name={cat.key} className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{cat.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{cat.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background p-8 text-center">
          <h3 className="text-lg font-semibold">{dict.categories.cantFind.title}</h3>
          <p className="text-muted-foreground">{dict.categories.cantFind.description}</p>
          <Link
            href="/vehicle/identify"
            className="mt-2 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            {dict.categories.cantFind.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}

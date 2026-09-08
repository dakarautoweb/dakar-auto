import type { Dictionary } from '@/src/i18n/dictionaries'
import { TrustIcon } from './icons'

export function TrustFeatures({ dict }: { dict: Dictionary }) {
  return (
    <section id="about" className="scroll-mt-20 border-b border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {dict.trust.items.map((item, i) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-gradient-to-b from-background to-surface/40 p-6 shadow-md shadow-black/[0.03] transition hover:-translate-y-1 hover:border-accent/20 hover:shadow-lg hover:shadow-black/[0.06] dark:shadow-black/20 dark:hover:shadow-black/40"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent shadow-inner ring-1 ring-accent/10">
              <TrustIcon index={i} className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

import type { Dictionary } from '@/src/i18n/dictionaries'
import { TrustIcon } from './icons'

export function TrustFeatures({ dict }: { dict: Dictionary }) {
  return (
    <section id="about" className="scroll-mt-20 border-b border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {dict.trust.items.map((item, i) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-background p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
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

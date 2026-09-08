import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'

export function HowItWorks({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-b border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title={dict.howItWorks.title} description={dict.howItWorks.description} center />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {dict.howItWorks.steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-border bg-background p-6">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {i + 1}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

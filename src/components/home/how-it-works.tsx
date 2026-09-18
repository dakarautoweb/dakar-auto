import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'

export function HowItWorks({ dict }: { dict: Dictionary }) {
  const steps = dict.howItWorks.steps
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading title={dict.howItWorks.title} description={dict.howItWorks.description} center />

        <ol className="mt-14 flex flex-col gap-10 sm:grid sm:grid-cols-4 sm:gap-6">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex sm:flex-col sm:items-center sm:text-center">
              {/* Connector — horizontal on desktop, vertical on mobile */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-6 left-6 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-accent/50 to-border sm:top-6 sm:left-1/2 sm:h-px sm:w-full sm:bg-gradient-to-r"
                />
              )}
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground shadow-glow">
                {i + 1}
              </span>
              <div className="ml-4 pb-2 sm:mt-4 sm:ml-0">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

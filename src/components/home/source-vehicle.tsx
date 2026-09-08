import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'

export function SourceVehicle({ dict }: { dict: Dictionary }) {
  return (
    <section id="source-a-vehicle" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent-soft via-background to-background p-10 text-center shadow-sm sm:p-16">
          <SectionHeading title={dict.sourceVehicle.title} description={dict.sourceVehicle.description} center />
          <Link
            href="/source-a-vehicle"
            className="mt-8 inline-flex items-center rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
          >
            {dict.sourceVehicle.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}

import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'

const BRANDS = [
  'Toyota',
  'Honda',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Ford',
  'Nissan',
  'Hyundai',
  'Volkswagen',
  'Kia',
  'Mazda',
  'Peugeot',
]

export function Brands({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading title={dict.brands.title} description={dict.brands.description} center />
        <div className="mt-10 rounded-2xl border border-border bg-surface/40 px-6 py-8 sm:px-10">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
            {BRANDS.map((brand) => (
              <span
                key={brand}
                className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium tracking-wide text-muted-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-sm"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

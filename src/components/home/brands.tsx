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
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

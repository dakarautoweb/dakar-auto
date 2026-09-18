import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'

// Real local logo renders (public/brands/*.png) — chrome-on-dark product
// shots, not flat vector marks, so this section is a permanently-dark
// "manufacturer wall" band (like the header) rather than theme-reactive:
// several of these files carry their own dark vignette baked in, which
// only reads cleanly against a dark tile in both themes.
const BRANDS = [
  { name: 'Toyota', file: 'toyota' },
  { name: 'Honda', file: 'honda' },
  { name: 'BMW', file: 'bmw' },
  { name: 'Mercedes-Benz', file: 'mercedes-benz' },
  { name: 'Audi', file: 'audi' },
  { name: 'Ford', file: 'ford' },
  { name: 'Nissan', file: 'nissan' },
  { name: 'Hyundai', file: 'hyundai' },
  { name: 'Volkswagen', file: 'volkswagen' },
  { name: 'Kia', file: 'kia' },
  { name: 'Mazda', file: 'mazda' },
  { name: 'Peugeot', file: 'peugeot' },
]

export function Brands({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-b border-header-border bg-header-bg text-header-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeading title={dict.brands.title} description={dict.brands.description} center />

        {/* One shared capsule instead of 12 separately-bordered tiles — a
            single panel with hairline dividers between cells reads as one
            manufacturer wall. All 12 sit on one row from `lg` up, matching
            the approved reference exactly, instead of wrapping into two
            rows of six. */}
        {/* No per-cell hard-edged hover ring here on purpose — a sharp inset
            border on a corner cell fights the parent's rounded-3xl clip and
            reads as a "cut" corner. Hover is a soft background wash plus a
            small logo scale/brightness change only, so the capsule's own
            rounded outline is the only edge the eye ever sees. */}
        <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-3 divide-x divide-y divide-white/10 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 lg:divide-y-0">
            {BRANDS.map((brand) => (
              <div
                key={brand.file}
                className="group flex h-24 flex-col items-center justify-center gap-2 transition-colors duration-200 hover:bg-accent/[0.06] sm:h-28 lg:h-32"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/brands/${brand.file}.png`}
                  alt={brand.name}
                  loading="lazy"
                  className="h-12 w-12 object-contain opacity-75 grayscale transition duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 sm:h-14 sm:w-14 lg:h-11 lg:w-11"
                />
                <span className="text-[0.65rem] font-medium tracking-wide text-header-muted opacity-80 transition duration-200 group-hover:text-accent group-hover:opacity-100 sm:text-xs">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

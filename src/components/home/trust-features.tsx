import type { Dictionary } from '@/src/i18n/dictionaries'
import { TrustIcon } from './icons'

// One unified premium panel (hairline dividers between cells) instead of
// four separately-hovering cards — matches the approved reference, where
// the benefit row reads as a single bordered strip with a soft accent glow
// along its edge, not four floating tiles.
export function TrustFeatures({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-card shadow-[0_0_0_1px_rgba(249,115,22,0.06),0_10px_30px_-12px_rgba(0,0,0,0.25)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {dict.trust.items.map((item, i) => (
              <div key={item.title} className="group flex items-center gap-6 p-8 transition duration-200 hover:bg-accent-soft/40 sm:p-9">
                <TrustIcon
                  index={i}
                  className="h-14 w-14 shrink-0 text-accent transition duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem]"
                />
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

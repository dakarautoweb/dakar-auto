import { PART_CATEGORY_IMAGES, type PartCategoryKey } from '@/src/lib/parts-catalog'

// Reacts to the sidebar's active category (shared state — see
// parts-page-client.tsx) so the top hero always shows real imagery for
// whatever the visitor is actually browsing, instead of one static banner.
// "All Parts" (activeCategory === null) shows a small braking + cooling
// pairing as a representative default, matching the page's original look.
export function PartsHeroVisual({ activeCategory }: { activeCategory: string | null }) {
  const primary = activeCategory ? PART_CATEGORY_IMAGES[activeCategory as PartCategoryKey] : '/parts/categories/braking.webp'
  const secondary = activeCategory ? null : '/parts/categories/cooling.webp'

  return (
    <div className="relative hidden aspect-[4/3] lg:block">
      <div className="absolute inset-0 -z-10 rounded-full bg-accent/15 blur-3xl" />
      {/* key={primary} remounts the <img> on category change, replaying the
          fade-in keyframe — a simple, reliable "crossfade" without holding
          two overlapping images in sync. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={primary}
        src={primary}
        alt=""
        className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl animate-[fade-in_350ms_ease-out]"
      />
      {secondary && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={secondary}
          src={secondary}
          alt=""
          className="absolute right-0 bottom-0 h-2/5 w-2/5 object-contain drop-shadow-xl animate-[fade-in_350ms_ease-out]"
        />
      )}
    </div>
  )
}

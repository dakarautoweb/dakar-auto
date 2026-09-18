// Dedicated backdrop for the "Trouver un véhicule" hero only — kept
// separate from the shared <HeroBackdrop> (still used as-is by the
// homepage hero and by /about, /parts) so this page's fix can't ripple
// into those.
//
// vehicle-hero-dark.png / vehicle-hero-light.png (car + Dubai skyline,
// no world map baked in — that's the older vehicle-search-dark/light.png
// pair, still reserved for the separate "Vous recherchez un véhicule
// complet ?" CTA banner and untouched here). Native size 2167×726.
//
// --- Anchor point: the right grid column, not the viewport edge ---
//
// This component is rendered *inside* the page's right grid column (see
// source-a-vehicle/page.tsx), not at the hero-section level. That column
// is the anchor: `absolute inset-y-0 left-0` pins this element's height
// and left edge to that column, and `h-full w-auto max-w-none` sizes it
// by height alone (the photo's own intrinsic ratio — never upscaled past
// native resolution just because the viewport got wider; `max-w-none`
// overrides Tailwind's `img { max-width: 100% }` reset).
//
// Anchoring to the *column* instead of the section's right edge (as the
// previous version did) is what makes wide viewports reveal more of the
// photo's right portion instead of dragging the whole photo — car
// included — further right. The column's own left edge only drifts at
// roughly half the rate of the viewport (it's centered inside a
// max-width container, not pinned to the viewport edge), so anchoring
// there keeps the car far more stable than anchoring to the section,
// while the section's real right edge — which *does* track the full
// viewport width — keeps moving right at full rate. The gap between
// those two things growing is exactly "reveal more to the right first."
// Only past the point where the photo's full native width already fits
// (well beyond ordinary desktop widths for this photo) does further
// widening stop revealing anything new — there's no more photo to show,
// and at that point it just leaves plain --background to the right,
// rather than stretching to fill it.
//
// CAR_SHIFT nudges the whole photo left by a fraction of its OWN
// rendered width (via `translateX`, always relative to the element's own
// box, never the viewport) so the car — which sits near dead-center of
// this specific photo, unlike the old vehicle-search-*.png where it was
// framed toward the photo's own right edge — lands inside the column
// rather than off past its right edge. Because the shift is relative to
// the image's own size, it doesn't need a different value at every
// breakpoint.
//
// The `mask-image` fade lives on this same element (not a separate
// full-width overlay), so it fades exactly the photo's own edges —
// wherever they land — into whatever's behind them, which is just this
// page's own --background. That's what makes the fade theme-aware for
// free: no separate dark/light gradient colors to keep in sync, and no
// seam, because there's no gradient spanning a differently-sized section
// independent of where the photo itself actually ends.
//
// Both edges fade now, not just the left: at ordinary widths the photo's
// right edge sits off-screen (still being "revealed" — see above), but
// past the point where its full native width already fits, the right
// edge becomes visible too, and it's just as much a hard photographic
// cutoff as the left one is. Symmetric fade, same treatment both sides.
// The gradient has extra intermediate stops (not just two per edge) so
// the falloff eases in gently and eases out gently rather than ramping
// at one constant linear rate — closer to a soft blur than a flat wipe.
//
// HeroMapOverlay (hero-map-overlay.tsx) reuses PHOTO_VIEWBOX,
// HERO_BOX_CLASSNAME and HERO_BOX_STYLE verbatim for its own <svg> box —
// two elements sharing one identical geometry can't drift apart from
// each other, on any viewport, without either of them changing. (The
// brightness/contrast/saturation lift below is intentionally kept out of
// that shared style — it's a photo-only enhancement, not something the
// map's own glow layers need.)
export const PHOTO_VIEWBOX = '0 0 2167 726'
const CAR_SHIFT_PERCENT = -34
export const HERO_BOX_CLASSNAME = 'absolute inset-y-0 left-0 h-full w-auto max-w-none'
export const HERO_BOX_STYLE = { transform: `translateX(${CAR_SHIFT_PERCENT}%)` }

const FADE_MASK =
  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 10%, black 24%, black 76%, rgba(0,0,0,0.45) 90%, transparent 100%)'

// A gentle lift — brighter skyline lights and floor reflections, a touch
// more warmth — without pushing into an oversaturated/neon look or
// flattening the scene's own depth.
const PHOTO_FILTER = 'brightness(1.07) contrast(1.04) saturate(1.1)'

export function VehicleSearchHeroImage() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/vehicle-search/vehicle-hero-light.png"
        alt=""
        className={`${HERO_BOX_CLASSNAME} opacity-100 transition-opacity duration-500 dark:opacity-0`}
        style={{ ...HERO_BOX_STYLE, filter: PHOTO_FILTER, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/vehicle-search/vehicle-hero-dark.png"
        alt=""
        className={`${HERO_BOX_CLASSNAME} opacity-0 transition-opacity duration-500 dark:opacity-100`}
        style={{ ...HERO_BOX_STYLE, filter: PHOTO_FILTER, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
      />
    </div>
  )
}

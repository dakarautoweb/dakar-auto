// Dedicated backdrop for the homepage hero only — kept separate from the
// shared <HeroBackdrop> (still used as-is by /parts and /about) so this
// page's fix can't ripple into those.
//
// hero-bg-dark.webp / hero-bg-light.webp (warehouse aisle photo). Native
// size 2172×724. The roller door / logo sits at native x≈1140 (measured
// directly from the source file).
//
// --- Anchor: tied to the page's own centered content container, not the
//     raw viewport edge ---
//
// The hero's text/VIN content sits inside `mx-auto max-w-[90rem]` (see
// hero.tsx) — full-bleed up to 1440px, then centered with growing side
// margins beyond it. ANCHOR_BOX below reproduces that exact same
// container (no padding — it's only a positioning reference, not a layout
// box) so the photo's anchor point moves together with the content
// instead of staying glued to the section's raw left edge: at ≤1440px
// its left edge is 0 (identical to the section edge), and past 1440px it
// drifts right at the container's own rate — half the viewport's growth,
// same as everything else on the page. The photo — and the door within
// it — travels with the page layout instead of a fixed viewport pixel.
//
// Inside that anchor box, `absolute inset-y-0 left-0 h-full w-auto
// max-w-none` sizes the photo by height alone (its own intrinsic ratio —
// never stretched horizontally, never upscaled past native resolution
// just because the viewport got wider; `max-w-none` overrides Tailwind's
// `img { max-width: 100% }` reset).
//
// SHIFT_PERCENT nudges the photo left by a FIXED fraction of its OWN
// rendered width (`translateX`, relative to the element's own box, never
// the viewport — a constant, not a vw-based recompute) so the door lands
// clear of the text column at ordinary desktop widths. Verified against
// real rendered screenshots (not just computed) at 1366/1440/1536/1920/
// 2560 — see the verification note this was tuned from.
//
// Growing the viewport past 1440px only moves the anchor box's own left
// edge (at half the viewport's rate) and the section's real right edge
// (at full rate) — the gap between those two growing is what reveals more
// of the photo's actual right portion, up to the point its full native
// width is already on screen. Past that, further widening just leaves
// plain --background (already what this photo's own edge fade blends
// into) instead of stretching or re-scaling to fill the gap.
const SHIFT_PERCENT = -14
const ANCHOR_BOX_CLASSNAME = 'relative mx-auto h-full max-w-[90rem]'
const HERO_PHOTO_CLASSNAME = 'absolute inset-y-0 left-0 h-full w-auto max-w-none'
const HERO_PHOTO_STYLE = { transform: `translateX(${SHIFT_PERCENT}%)` }

// Gentle fade on both edges so the photo's own hard boundaries (its own
// left edge, and its true right edge once fully revealed on wide
// viewports) blend into the page background instead of a hard cutoff.
const FADE_MASK =
  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 6%, black 16%, black 88%, rgba(0,0,0,0.45) 95%, transparent 100%)'

// Below lg, hero.tsx's grid collapses to a single stacked column (label,
// headline, description, VIN card, feature cards, visual panel, CTA nudge
// all in one tall flow) instead of desktop's bounded-height 2-column row.
// The old `inset-0` here made this wrapper match that *entire* stacked
// section height, stretching the image (h-full) far taller than its own
// aspect ratio wants — rendering it enormously wide (and upscaled past
// native resolution) while only a thin, mostly-featureless vertical sliver
// of it stayed visible behind the tall mobile content, i.e. not "a
// separate, sensible mobile crop" at all, just the desktop composition
// stretched. Below lg this is now a fixed-height strip pinned to the top
// of the section instead — same photo/anchor/shift logic, just given a
// sane mobile-appropriate height — with its own bottom fade so it blends
// into the page background instead of a hard cutoff. Unchanged at lg+.
const MOBILE_STRIP_CLASSNAME = 'pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] overflow-hidden lg:inset-0 lg:h-auto'

export function HomeHeroPhoto() {
  return (
    <div aria-hidden="true" className={MOBILE_STRIP_CLASSNAME}>
      <div className={ANCHOR_BOX_CLASSNAME}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/hero-bg-light.webp"
          alt=""
          className={`${HERO_PHOTO_CLASSNAME} opacity-100 transition-opacity duration-500 dark:opacity-0`}
          style={{ ...HERO_PHOTO_STYLE, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/hero-bg-dark.webp"
          alt=""
          className={`${HERO_PHOTO_CLASSNAME} opacity-0 transition-opacity duration-500 dark:opacity-100`}
          style={{ ...HERO_PHOTO_STYLE, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
        />
      </div>
      {/* Bottom fade into the page background (near-black in dark, the
          warm light --background in light) so the photo never ends on a
          hard edge — below lg at the strip's base, at lg+ at the section's. */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/60 to-transparent lg:h-48 xl:h-56" />
    </div>
  )
}

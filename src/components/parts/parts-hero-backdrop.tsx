// Light-theme hero photo for "Pièces" — a page-specific layer, not folded
// into the shared <HeroBackdrop> (still used here, unmodified, for the
// dark-mode photo, and by /about for both themes) so this page's own
// light-mode treatment can never ripple into /about's hero.
//
// hero-background-light.png (2171×724, ~3:1 — the same ratio as the dark
// hero-background.webp already rendered here via <HeroBackdrop>) is sized
// by height alone (`auto 100%`, not `cover`) so a wide section reveals
// more of the photo instead of upscaling it past its native resolution,
// and anchored to the right the same way <HeroBackdrop>'s own `position`
// prop already works for the dark photo.
//
// Dark mode renders nothing here — <HeroBackdrop> already supplies the
// real dark photo for that theme; this layer only replaces light mode's
// previously-empty accent-tinted gradient wash. The existing full-width
// `bg-gradient-to-r from-background via-background/75 to-background/40`
// overlay already rendered alongside <HeroBackdrop> in parts-page-client
// sits on top of this layer too, in both themes, and is what fades it
// smoothly into --background on the text side — no separate mask needed
// here, and no seam, since it's the exact same fade already applied to
// the dark photo.
export function PartsHeroBackdrop({ position = 'center right' }: { position?: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-no-repeat opacity-100 transition-opacity duration-500 dark:opacity-0"
      style={{
        backgroundImage: "url('/hero/hero-background-light.png')",
        backgroundSize: 'auto 100%',
        backgroundPosition: position,
      }}
    />
  )
}

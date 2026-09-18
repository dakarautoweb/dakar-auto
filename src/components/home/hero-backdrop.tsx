// Real hero-background.webp is a dark night-city photo with no light-theme
// equivalent — dark mode shows it, light mode shows a soft accent wash.
// Both layers stay mounted and only their opacity flips on the `dark`
// class, so toggling the theme crossfades between them (background-image
// itself can't be transitioned) instead of hard-cutting between the two.
//
// `pair` swaps this for two real theme-specific photos (approved
// hero-bg-dark.webp / hero-bg-light.webp for the homepage, or the approved
// vehicle-search-dark.png / vehicle-search-light.png for the vehicle
// request page) — both stay mounted and only opacity flips, so the
// dark/light switch crossfades instead of snapping.
export function HeroBackdrop({
  position = 'center right',
  pair,
}: {
  position?: string
  pair?: { dark: string; light: string }
}) {
  if (pair) {
    // `auto 100%` (height-driven, width follows the photo's own aspect
    // ratio) instead of `cover` — `cover` picks whichever of width/height
    // needs the bigger scale-up to fill the box, and on a hero section
    // much wider than the source photo (ultrawide monitors especially)
    // that's the width, forcing the whole photo past its native
    // resolution and visibly softening it. Sized by height alone, the
    // photo is only ever scaled to fit the hero's height — never upscaled
    // just because the viewport got wider. `position` (its horizontal
    // half, e.g. "right" in "center right") then anchors the photo's own
    // right edge to the section's right edge: a wider viewport reveals
    // more of the photo's actual width (up to its full native size)
    // instead of blowing the same photo up bigger, and a narrower one
    // crops gracefully from the left — the composition on the right never
    // shifts or distorts either way. Any leftover width beyond the
    // photo's native extent is plain --background, which is already what
    // the gradient overlay over this backdrop fades into.
    return (
      <>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-no-repeat opacity-100 transition-opacity duration-500 dark:opacity-0"
          style={{ backgroundImage: `url('${pair.light}')`, backgroundSize: 'auto 100%', backgroundPosition: position }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-no-repeat opacity-0 transition-opacity duration-500 dark:opacity-100"
          style={{ backgroundImage: `url('${pair.dark}')`, backgroundSize: 'auto 100%', backgroundPosition: position }}
        />
      </>
    )
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent-soft via-transparent to-transparent opacity-100 transition-opacity duration-500 dark:opacity-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 dark:opacity-100"
        style={{ backgroundImage: "url('/hero/hero-background.webp')", backgroundSize: 'cover', backgroundPosition: position }}
      />
    </>
  )
}

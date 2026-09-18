// Shared helper for the theme/language switch crossfade (see
// site-header.tsx consumers: theme-toggle.tsx, language-switcher.tsx).
// The View Transitions API captures a snapshot of the DOM before and after
// `update()` runs and cross-fades between them natively — no per-element
// animation code needed, which is what lets a full-page RSC refresh (new
// locale strings, new theme class) crossfade as one image instead of every
// string animating individually. Falls back to an instant, unanimated
// update when the API is unsupported or the user prefers reduced motion.
export function withViewTransition(update: () => void): void {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const supportsViewTransitions = typeof document !== 'undefined' && 'startViewTransition' in document

  if (!supportsViewTransitions || prefersReducedMotion) {
    update()
    return
  }

  document.startViewTransition(update)
}

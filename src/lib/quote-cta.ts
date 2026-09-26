import type { MouseEvent } from 'react'

// "Demander un devis" → homepage VIN field, focused, with a short hint.
//
// Two paths, one outcome:
// - From another route, the CTA is a normal link to QUOTE_HREF. The hash
//   keeps a no-JS fallback (plain anchor jump); `?quote=1` is the signal
//   the hero reads once on mount, then strips via history.replaceState.
// - Already on "/", the hero is mounted and wouldn't re-run its mount
//   effect for a same-page link, so the click is intercepted and a window
//   event is dispatched instead — no navigation, no URL change.
export const QUOTE_HREF = '/?quote=1#hero-request'
export const QUOTE_PARAM = 'quote'
export const QUOTE_FOCUS_EVENT = 'dakar:quote-focus'

export function handleQuoteCtaClick(event: MouseEvent<HTMLAnchorElement>, pathname: string): void {
  // Let modified clicks (new tab/window) behave like a normal link.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (pathname !== '/') return
  event.preventDefault()
  window.dispatchEvent(new Event(QUOTE_FOCUS_EVENT))
}

'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Script from 'next/script'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { RefreshIcon } from '@/src/components/home/icons'

// Public site key — meant to ship in the client bundle (that's the whole
// point of NEXT_PUBLIC_*). The matching TURNSTILE_SECRET_KEY never appears
// in any 'use client' file or is passed to one; it only lives in
// src/services/turnstile/verify.ts, a server-only module.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

// How long we let the widget sit in "loading" before treating it as failed.
// Cloudflare's own script/challenge normally resolves in well under a
// second; if it hasn't after this long, something upstream (blocked
// script, unlisted hostname, stalled network) silently never fired either
// callback, and the previous version of this component just sat on the
// spinner forever with no way out except a manual page refresh.
const LOAD_TIMEOUT_MS = 9000

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export type TurnstileWidgetHandle = {
  // Discards the current (possibly already-used, expired, or failed)
  // challenge and requests a fresh one — call this after any failed submit
  // so a retry always presents a brand new token, never a reused one.
  reset: () => void
}

// loading: script not yet loaded, or loaded but the widget hasn't rendered
// into the DOM yet — the only state that should ever show a spinner.
// ready: window.turnstile.render() has been called; the widget itself now
// owns its own UI (checkbox / auto-pass / challenge).
// error: the challenges.cloudflare.com script itself failed to load (blocked
// by the network/an extension), the widget's own error-callback fired, or
// LOAD_TIMEOUT_MS elapsed without either callback firing — all three must
// surface a real, visible message with a way to retry, never silently leave
// a blank disabled button with no explanation.
// expired: a previously-solved challenge expired — the widget resets itself
// visually, but we also surface a short note since the Submit button just
// silently went back to disabled.
type Status = 'loading' | 'ready' | 'error' | 'expired'

// Thin wrapper around Cloudflare's Managed Turnstile widget, rendered in
// explicit mode so we control exactly when it mounts and can reset it
// programmatically. Reusable across every public form that needs one
// (parts request review step, vehicle request review step, /track lookup).
export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  {
    dict: Dictionary
    onToken: (token: string) => void
    onExpire?: () => void
    onError?: () => void
    className?: string
  }
>(function TurnstileWidget({ dict, onToken, onExpire, onError, className }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  // Bumped on every Retry click. Used as the <Script> element's `key` (forces
  // a real remount instead of Next.js treating it as the same already-
  // loaded/failed script) and appended to the script URL (forces an actual
  // new network request instead of a cached failure).
  const [attempt, setAttempt] = useState(0)

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current || !SITE_KEY) return

    const container = containerRef.current
    // A fresh widget instance always starts unsolved — clear out any token
    // a previous mount of this same component may have left behind (e.g.
    // the user went back from Review to edit Contact, which unmounts this
    // widget, then returned to Review, remounting it). Without this, a
    // stale truthy token could leave Submit enabled next to a
    // not-yet-solved challenge.
    onToken('')
    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: SITE_KEY,
      callback: (token) => {
        onToken(token)
        setStatus('ready')
      },
      'expired-callback': () => {
        onToken('')
        setStatus('expired')
        onExpire?.()
      },
      'error-callback': () => {
        onToken('')
        setStatus('error')
        onError?.()
      },
    })
    setStatus('ready')

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady])

  // Bounds how long "loading" can last. Without this, a script that "loads"
  // (fires onLoad) but never actually exposes a working window.turnstile —
  // e.g. blocked by a network filter that returns an empty 200 instead of a
  // real error, or a site key not allow-listed for the current hostname in
  // local dev — left the effect above's `!window.turnstile` guard bailing
  // out silently forever, with no error callback ever firing to catch it.
  // That silent stall, not a slow-but-working widget, was the actual cause
  // of "Loading security check..." hanging indefinitely.
  useEffect(() => {
    if (status !== 'loading') return
    const timer = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'error' : current))
    }, LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [status, attempt])

  function handleRetry() {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current)
    }
    widgetIdRef.current = null
    onToken('')
    setScriptReady(false)
    setStatus('loading')
    setAttempt((current) => current + 1)
  }

  if (!SITE_KEY) {
    // Fails safe by construction, not just by convention: with no widget
    // ever rendered, onToken never fires, so the token stays empty and
    // every submit button gated on it (see review-step.tsx / track-lookup-
    // form.tsx) stays disabled — this can never silently skip verification.
    // The message below is what turns that into a visible, explained state
    // instead of a mysteriously-disabled button.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set — widget will not render')
    }
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {dict.turnstile.unavailable}
      </p>
    )
  }

  return (
    <div className={className}>
      <Script
        key={attempt}
        src={`https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit${attempt > 0 ? `&retry=${attempt}` : ''}`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setStatus('error')}
      />

      {status === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          {dict.turnstile.loading}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-red-600 dark:text-red-400">
          <span>{dict.turnstile.loadError}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-600/40 px-2.5 py-1 text-xs font-medium text-red-600 transition duration-200 hover:bg-red-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            {dict.turnstile.retry}
          </button>
        </p>
      )}
      {status === 'expired' && (
        <p role="status" className="text-sm text-muted-foreground">
          {dict.turnstile.required}
        </p>
      )}

      {/* overflow-hidden + max-w-full on the injected iframe: Cloudflare's
          widget occasionally reports/renders a couple pixels wider than
          its container on narrow mobile widths, which was enough to
          trigger real horizontal page overflow — this clips that instead
          of letting it push the page wider. Kept mounted (not conditionally
          removed) regardless of `status`, since window.turnstile.render()
          above targets this exact node — it's simply empty (0px) until
          ready, so hiding it isn't needed for the loading/error text above
          to read cleanly. */}
      <div ref={containerRef} className="w-full max-w-full overflow-hidden [&_iframe]:max-w-full" />
    </div>
  )
})

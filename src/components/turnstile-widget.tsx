'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { preconnect } from 'react-dom'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { AlertCircleIcon, RefreshIcon } from '@/src/components/home/icons'
import { describeTurnstileError, isTurnstileTestSiteKey } from '@/src/lib/turnstile-errors'

// Public site key — meant to ship in the client bundle (that's the whole
// point of NEXT_PUBLIC_*). Read with a literal `process.env.NEXT_PUBLIC_…`
// access so Next inlines it at build time; a value added to the host after
// the build only takes effect on the next deploy. The matching
// TURNSTILE_SECRET_KEY never appears in any 'use client' file or is passed
// to one; it only lives in src/services/turnstile/verify.ts, a server-only
// module.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''

// Loaded exactly as Cloudflare documents it (no proxy, no extra query
// params). render=explicit so we decide when and where the widget mounts.
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// How long the api.js download may take before it counts as failed.
// Cloudflare's script normally arrives in well under a second; a request
// that neither loads nor errors (network filter returning nothing, stalled
// connection) would otherwise leave the spinner up forever. Generous
// enough for a slow mobile connection, where 9s was cutting off real loads.
const SCRIPT_TIMEOUT_MS = 15000

// Two silent automatic retries, backing off (1.5s, then 3s), cover the
// common transient cases (flaky network, a Cloudflare hiccup, a challenge
// error in the browser). Configuration errors (bad site key, hostname not
// allowed) skip them — see describeTurnstileError. After that the compact
// error block with a manual Retry button takes over, so a broken setup can
// never loop.
const MAX_AUTO_RETRIES = 2
const AUTO_RETRY_DELAY_MS = 1500

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: (errorCode?: string) => boolean | void
      retry?: 'auto' | 'never'
    }
  ) => string | undefined
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

// Module-level loader shared by every widget on the page and across
// client-side navigations. This replaces next/script, whose onLoad does not
// fire again for a script it has already loaded — so a widget mounted after
// a client-side navigation (e.g. home → /track, or Review → Contact →
// Review) never learned the script was ready and fell into the error state
// after the timeout. A failed or timed-out load clears the cached promise
// and removes its <script> tag, so the next attempt really re-downloads.
let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstileScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  const attempt = new Promise<TurnstileApi>((resolve, reject) => {
    document.querySelectorAll('script[data-turnstile-loader]').forEach((el) => el.remove())

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.dataset.turnstileLoader = ''

    const timer = window.setTimeout(() => {
      script.remove()
      reject(new Error(`script timed out after ${SCRIPT_TIMEOUT_MS}ms`))
    }, SCRIPT_TIMEOUT_MS)

    script.onload = () => {
      window.clearTimeout(timer)
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('script loaded but window.turnstile is missing'))
    }
    script.onerror = () => {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('script failed to load (network or blocked)'))
    }

    document.head.appendChild(script)
  })

  scriptPromise = attempt
  attempt.catch(() => {
    if (scriptPromise === attempt) scriptPromise = null
  })
  return attempt
}

let configWarningLogged = false

export type TurnstileWidgetHandle = {
  // Discards the current (possibly already-used, expired, or failed)
  // challenge and requests a fresh one — call this after any failed submit
  // so a retry always presents a brand new token, never a reused one.
  reset: () => void
}

// loading: script downloading, widget rendering, or waiting out the short
// automatic-retry delay — the only state that shows a spinner.
// ready: the widget is rendered and owns its own UI (checkbox / auto-pass /
// challenge).
// error: the script failed or timed out, render() threw, or the widget's
// error-callback fired — and the automatic retry was already used. The
// Cloudflare widget is removed so its own error UI doesn't sit next to ours.
// expired: a previously-solved challenge expired — the widget refreshes
// itself, but we surface a short note since Submit silently went back to
// disabled.
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
  const [status, setStatus] = useState<Status>('loading')
  // Bumped by the automatic retry and by the Retry button. Every bump runs
  // the mount effect again: remove any old widget, (re)load the script if
  // needed, and render a brand new widget.
  const [attempt, setAttempt] = useState(0)
  const autoRetriesRef = useRef(0)
  const retryTimerRef = useRef<number | null>(null)

  // Opens the connection to Cloudflare while the page is still hydrating,
  // so api.js and the challenge iframe start sooner — less time for the
  // script timeout to bite on a slow network. Deduplicated by React.
  if (SITE_KEY) preconnect('https://challenges.cloudflare.com')

  // Latest callbacks without re-running the mount effect on every parent
  // render (the parents pass inline setters).
  const callbacksRef = useRef({ onToken, onExpire, onError })
  useEffect(() => {
    callbacksRef.current = { onToken, onExpire, onError }
  })

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  const removeWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {
        // Already gone — nothing to clean up.
      }
    }
    widgetIdRef.current = null
  }, [])

  // One concise console line per failure, then either a delayed automatic
  // retry or the error block. Diagnostic context only: the page hostname
  // (what Cloudflare's hostname allow-list is checked against) and the
  // first characters of the public site key (enough to tell which key a
  // deployment was built with) — never the token.
  const handleFailure = useCallback(
    (stage: 'script' | 'render' | 'widget', detail: string, retryable = true) => {
      removeWidget()
      callbacksRef.current.onToken('')
      const willRetry = retryable && autoRetriesRef.current < MAX_AUTO_RETRIES
      const context = `host=${window.location.hostname} key=${SITE_KEY.slice(0, 6)}… auto-retry ${autoRetriesRef.current}/${MAX_AUTO_RETRIES}`
      const log = retryable ? console.warn : console.error
      log(`[turnstile] ${stage} failed: ${detail} (${context})${willRetry ? ' — retrying automatically' : ''}`)

      if (willRetry) {
        autoRetriesRef.current += 1
        setStatus('loading')
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null
          setAttempt((current) => current + 1)
        }, AUTO_RETRY_DELAY_MS * autoRetriesRef.current)
        return
      }
      setStatus('error')
      callbacksRef.current.onError?.()
    },
    [removeWidget]
  )

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    loadTurnstileScript().then(
      (turnstile) => {
        const container = containerRef.current
        if (cancelled || !container) return

        // A fresh widget instance always starts unsolved — clear out any
        // token a previous mount may have left behind (e.g. the user went
        // back from Review to edit Contact, then returned). Without this, a
        // stale truthy token could leave Submit enabled next to a
        // not-yet-solved challenge.
        callbacksRef.current.onToken('')
        try {
          const widgetId = turnstile.render(container, {
            sitekey: SITE_KEY,
            // Our own bounded retry replaces Cloudflare's built-in one, so
            // the two never fight over the same widget.
            retry: 'never',
            callback: (token) => {
              autoRetriesRef.current = 0
              callbacksRef.current.onToken(token)
              setStatus('ready')
            },
            'expired-callback': () => {
              callbacksRef.current.onToken('')
              setStatus('expired')
              callbacksRef.current.onExpire?.()
            },
            'error-callback': (errorCode) => {
              const { retryable, hint } = describeTurnstileError(errorCode)
              handleFailure('widget', `error code ${errorCode ?? 'unknown'}: ${hint}`, retryable)
              // Tells Turnstile the error was handled (no uncaught throw).
              return true
            },
          })
          if (!widgetId) throw new Error('render() returned no widget id')
          widgetIdRef.current = widgetId
          setStatus('ready')
        } catch (err) {
          handleFailure('render', err instanceof Error ? err.message : 'unknown error')
        }
      },
      (err: unknown) => {
        if (!cancelled) handleFailure('script', err instanceof Error ? err.message : 'unknown error')
      }
    )

    return () => {
      cancelled = true
      removeWidget()
    }
  }, [attempt, handleFailure, removeWidget])

  useEffect(
    () => () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
    },
    []
  )

  useEffect(() => {
    if (configWarningLogged) return
    if (!SITE_KEY) {
      configWarningLogged = true
      console.error('[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set in this build — widget disabled, protected forms stay locked')
    } else if (isTurnstileTestSiteKey(SITE_KEY) && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      configWarningLogged = true
      console.error('[turnstile] this build uses a Cloudflare test site key — server verification with the real secret will reject its tokens')
    }
  }, [])

  function handleRetry() {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    removeWidget()
    onToken('')
    autoRetriesRef.current = 0
    setStatus('loading')
    setAttempt((current) => current + 1)
  }

  if (!SITE_KEY) {
    // Fails safe by construction, not just by convention: with no widget
    // ever rendered, onToken never fires, so the token stays empty and
    // every submit button gated on it (see review-step.tsx / track-lookup-
    // form.tsx) stays disabled — this can never silently skip verification.
    // No Retry button here: retrying can't fix a missing build-time key.
    return (
      <div className={className}>
        <TurnstileNotice title={dict.turnstile.unavailable} />
      </div>
    )
  }

  return (
    <div className={className}>
      {status === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          {dict.turnstile.loading}
        </p>
      )}
      {status === 'error' && (
        <TurnstileNotice title={dict.turnstile.loadError} hint={dict.turnstile.loadErrorHint}>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition duration-200 hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            {dict.turnstile.retry}
          </button>
        </TurnstileNotice>
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
          of letting it push the page wider. Always mounted, since
          turnstile.render() targets this exact node; it's empty (0px)
          whenever no widget is rendered. */}
      <div ref={containerRef} className="w-full max-w-full overflow-hidden [&_iframe]:max-w-full" />
    </div>
  )
})

// Compact inline notice: calm surface instead of a red wall of text, with
// room for an action on the right (wraps below on narrow screens).
function TurnstileNotice({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-surface/60 px-3 py-2.5">
      <AlertCircleIcon className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-foreground">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

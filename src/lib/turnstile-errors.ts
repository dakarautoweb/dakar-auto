// Classifies Cloudflare Turnstile client error codes (the value passed to
// the widget's error-callback) so the widget knows whether retrying can
// help, and so the console line says what to fix. Reference:
// https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
//
// Pure and dependency-free so it's unit-testable outside React.

export type TurnstileErrorInfo = {
  // false: a deployment/configuration problem — retrying the same widget
  // can never succeed, so the compact error block shows immediately.
  retryable: boolean
  hint: string
}

// Codes that mean the site key / hostname / widget options are wrong for
// this deployment. Everything else (network, iframe load, clock skew,
// challenge execution, generic client errors) is worth a fresh attempt.
const CONFIG_ERRORS: Record<string, string> = {
  '110100': 'invalid site key — check NEXT_PUBLIC_TURNSTILE_SITE_KEY in this build',
  '110110': 'invalid site key — check NEXT_PUBLIC_TURNSTILE_SITE_KEY in this build',
  '400020': 'invalid site key — check NEXT_PUBLIC_TURNSTILE_SITE_KEY in this build',
  '400070': 'site key disabled in the Cloudflare dashboard',
  '110200': 'hostname not allowed for this site key — add it under the widget’s Hostname Management in Cloudflare Turnstile',
  '110420': 'invalid action parameter',
  '110430': 'invalid cData parameter',
  '400030': 'invalid widget size option',
  '400040': 'invalid widget appearance option',
  '110500': 'unsupported browser',
}

export function describeTurnstileError(code: string | undefined): TurnstileErrorInfo {
  const normalized = (code ?? '').trim()
  const config = CONFIG_ERRORS[normalized]
  if (config) return { retryable: false, hint: config }

  if (normalized.startsWith('1106') || normalized.startsWith('2001')) {
    return { retryable: true, hint: 'challenge timed out — often a wrong device clock' }
  }
  if (normalized.startsWith('2005')) {
    return { retryable: true, hint: 'challenge iframe failed to load — network, ad blocker or strict privacy settings' }
  }
  if (normalized.startsWith('3') || normalized.startsWith('6')) {
    return { retryable: true, hint: 'challenge failed in the browser — extension, privacy mode or bot suspicion' }
  }
  return { retryable: true, hint: 'transient widget error' }
}

// Cloudflare's documented dummy site keys (1x…, 2x…, 3x…) — always pass,
// always fail, or always force a challenge. Fine locally; a production
// build carrying one means the real key was never set for that environment.
export function isTurnstileTestSiteKey(siteKey: string): boolean {
  return /^[123]x0{8}/.test(siteKey)
}

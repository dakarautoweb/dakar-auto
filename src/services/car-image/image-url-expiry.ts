// Pure, no imports.
//
// CarImages API's signed `/image` URLs carry an `expires=<unix seconds>`
// query parameter and stop resolving once that time passes (documented:
// 403 "Invalid signature, expired URL, or domain not allowed"). A URL
// built this way can never be treated as a permanent asset — persisting
// it to the `vehicles.image_url` column would leave that row pointing at
// a broken image forever once the signature expires, since that row is
// never re-visited after creation (see create-request.ts). This checks
// URL *shape* (an `expires` timestamp baked into the query string), not
// anything about a specific vendor or vehicle — the same logic would
// apply to any image provider that signs URLs the same way.

function parseExpiresParam(url: string): number | null {
  try {
    const parsed = new URL(url)
    const raw = parsed.searchParams.get('expires')
    if (raw === null || !/^\d+$/.test(raw)) return null
    return Number(raw)
  } catch {
    return null
  }
}

// True for any URL carrying an `expires` query parameter — used to decide
// whether it's safe to persist as a long-lived DB value at all.
export function isExpiringImageUrl(url: string): boolean {
  return parseExpiresParam(url) !== null
}

// True only once that expiry has actually passed — used to decide whether
// an already-persisted (pre-existing) URL is still worth trying versus
// needing a fresh one from the provider.
export function isImageUrlExpired(url: string, now: number = Date.now()): boolean {
  const expiresAtSeconds = parseExpiresParam(url)
  if (expiresAtSeconds === null) return false
  return expiresAtSeconds * 1000 <= now
}

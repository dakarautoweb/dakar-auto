import 'server-only'

// CarImages API (carimagesapi.com) — https://carimagesapi.com/docs
// Active, sole vehicle-image provider. Auth via an `api_key` query
// parameter (not a header). CarsXE and carimage.dev are no longer called
// anywhere in this module.
export const CARIMAGES_BASE_URL = 'https://carimagesapi.com'

const carImagesApiKey = process.env.CARIMAGES_API_KEY?.trim() || null

// Server-only by construction ('server-only' import above throws if this
// module is ever pulled into a client bundle) — this is the one function
// that touches the raw key, and it's never re-exported as NEXT_PUBLIC_.
export function getCarImagesApiKey(): string | null {
  return carImagesApiKey
}

// Best-effort enrichment happening synchronously inside a VIN lookup the
// customer is actively waiting on — must stay short.
export const CARIMAGES_TIMEOUT_MS = 6000

// Per model candidate this can make up to 3 requests (catalog metadata
// once, then signed-url + a GET to resolve the final image per
// candidate). Bounds total wall-clock time across the whole lookup;
// remaining attempts are skipped once the budget is used up, same as if
// they'd all come back "unavailable".
export const CARIMAGES_TOTAL_BUDGET_MS = 9000

// `view` is case-sensitive per the docs (front34 | front34-r | front |
// side | side-r | rear34 | rear34-r | rear); front34 is the ¾-front
// default.
export const CARIMAGES_VIEW = 'front34'
export const CARIMAGES_FORMAT = 'webp'

// CarImages signed-url links point at their own CDN and are valid for a
// vendor-controlled expiry window (the `expires` param baked into the
// URL) — cached roughly in line with that, not indefinitely, since the
// signature itself expires. VehicleImage's own onError fallback to
// /vehicle-fallback.png covers a link that's gone stale before this cache
// entry expires either way.
export const CAR_IMAGE_POSITIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const CAR_IMAGE_NEGATIVE_CACHE_TTL_MS = 12 * 60 * 60 * 1000

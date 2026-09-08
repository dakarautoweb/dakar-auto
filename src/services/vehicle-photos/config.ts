import 'server-only'

// Auto.dev Vehicle Photos API — https://docs.auto.dev/v2/products/vehicle-photos
// GET {AUTO_DEV_BASE_URL}/photos/{vin}, same host, same key, same auth
// scheme as the VIN decode API (see src/services/vin/config.ts) — Auto.dev
// serves both from one gateway, so we reuse that config rather than
// duplicating the base URL / key-reading logic.
export { AUTO_DEV_BASE_URL, getAutoDevApiKey } from '@/src/services/vin/config'

// Shorter than the VIN decode timeout — this call is best-effort and must
// not meaningfully delay the VIN result the customer is waiting on.
export const AUTO_DEV_PHOTOS_TIMEOUT_MS = 5000

// Cap how many extra angles we carry around per lookup — the API can
// return dozens of images (see docs example: 21), and we only ever show
// one on the confirmation card today.
export const MAX_ADDITIONAL_PHOTOS = 5

import 'server-only'

// Auto.dev v2 VIN Decode API — https://docs.auto.dev/v2/products/vin-decode
// GET {AUTO_DEV_BASE_URL}/vin/{vin}, Authorization: Bearer <key>.
// (v1, at https://auto.dev/api, is an older undocumented-auth catalog-style
// endpoint; v2 is the current one with documented auth, errors, and rate
// limiting, so that's what this integration targets.)
export const AUTO_DEV_BASE_URL = 'https://api.auto.dev'

export const AUTO_DEV_TIMEOUT_MS = 8000

const apiKey = process.env.AUTO_DEV_API_KEY?.trim() || null

export function getAutoDevApiKey(): string | null {
  return apiKey
}

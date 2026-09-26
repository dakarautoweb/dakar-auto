// Provider-neutral shapes for the future PartsTech / Nexpart parts-sourcing
// integration. No live API calls exist anywhere in this module yet — see
// partstech-provider.ts and nexpart-provider.ts, whose methods only ever
// return 'not_configured' or 'not_implemented' today.

export type SupplierId = 'partstech' | 'nexpart'

export type SupplierSearchQuery = {
  keyword: string
  partNumber: string
  // Optional vehicle context (VIN) a provider could use to narrow fitment —
  // not validated/decoded here, that's src/services/vin, kept untouched.
  vin: string
}

// One normalized result line, whichever provider it came from — keeping
// this provider-neutral is what lets the results table/sort/filter logic
// never branch on `provider`.
export type SupplierPartResult = {
  provider: SupplierId
  supplierName: string
  partNumber: string
  brand: string | null
  description: string
  price: number | null
  currency: string | null
  available: boolean | null
  quantity: number | null
  eta: string | null
  imageUrl: string | null
  // Untouched provider payload for this line, kept for future debugging /
  // a "view raw" action once real data exists — never rendered directly.
  rawReference: unknown
}

// Discriminated union so the UI can render a distinct, honest state per
// case (missing credentials vs. an adapter that simply isn't implemented
// yet vs. a real future failure) instead of collapsing everything into one
// generic error string.
export type SupplierOutcomeStatus = 'not_configured' | 'not_implemented' | 'unavailable' | 'error' | 'ok'

export type SupplierSearchOutcome =
  | { status: 'not_configured' | 'not_implemented' | 'unavailable' | 'error' }
  | { status: 'ok'; results: SupplierPartResult[] }

export type SupplierAvailabilityOutcome =
  | { status: 'not_configured' | 'not_implemented' | 'unavailable' | 'error' }
  | { status: 'ok'; available: boolean; quantity: number | null; eta: string | null }

export type SupplierPartDetailsOutcome =
  | { status: 'not_configured' | 'not_implemented' | 'unavailable' | 'error' }
  | { status: 'ok'; result: SupplierPartResult }

// The adapter contract every provider implements. Real HTTP calls belong
// entirely inside each provider's own file once real API docs and
// credentials exist for it — this layer only defines the shape, and
// nothing outside these adapter files should ever need to change when
// that happens.
export interface SupplierProvider {
  readonly id: SupplierId
  readonly name: string
  isConfigured(): boolean
  searchParts(query: SupplierSearchQuery): Promise<SupplierSearchOutcome>
  checkAvailability(partNumber: string): Promise<SupplierAvailabilityOutcome>
  getPartDetails(partNumber: string): Promise<SupplierPartDetailsOutcome>
}

// Serializable summary of a provider's config state — safe to pass from a
// server component into a client component, unlike the provider instance
// itself or the raw env values it's derived from.
export type SupplierProviderStatus = {
  id: SupplierId
  name: string
  configured: boolean
}

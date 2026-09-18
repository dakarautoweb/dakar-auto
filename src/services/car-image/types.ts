// Pure types only — safe to import from both server and client code.

export type CarImageQuery = {
  year: number
  make: string
  model: string
  // Auto.dev's decoded body style (e.g. "Coupe 2D"), when available. Used
  // to build body-style-aware model candidates and to reject a result
  // whose provider-side metadata contradicts it — never sent anywhere
  // that would change the displayed vehicle data.
  bodyStyle?: string | null
}

export type CarImageLookupResult =
  | { status: 'found'; imageUrl: string }
  | { status: 'not_found' }
  // Covers every provider-side failure that isn't "this vehicle doesn't
  // exist in the catalog": timeouts, network errors, auth failures,
  // rate limits, malformed responses. The caller never needs the
  // distinction — either way imageUrl just stays null and the existing
  // VehicleImage fallback takes over.
  | { status: 'unavailable' }

export interface CarImageProvider {
  lookup(query: CarImageQuery): Promise<CarImageLookupResult>
}

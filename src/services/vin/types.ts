// Pure types only — safe to import from both server and client code.

export type VehicleResult = {
  vin: string
  year: number | null
  make: string
  model: string
  trim: string | null
  engine: string | null
  transmission: string | null
  bodyStyle: string | null
  fuelType: string | null
  drivetrain: string | null
  imageUrl: string | null
  source: string
}

// A real, successful decode that identified the make but not the model
// (e.g. many European-market VINs: Auto.dev recognizes the manufacturer
// from the WMI but has no model record). Everything here is exactly what
// the provider returned — model is always null and nothing is guessed.
// The customer completes the rest through manual selection with `make`
// pre-filled. Deliberately has no imageUrl: photo lookups need a model.
export type PartialVehicleResult = Omit<VehicleResult, 'model' | 'imageUrl'> & {
  model: null
}

export type VinLookupResult =
  | { status: 'found'; vehicle: VehicleResult }
  | { status: 'partial'; vehicle: PartialVehicleResult }
  | { status: 'not_found' }
  | { status: 'invalid'; reason: 'length' | 'characters' }
  // Covers every provider-side failure that isn't "this VIN doesn't exist":
  // network errors, timeouts, auth failures, rate limits, malformed
  // responses. Deliberately one bucket — the customer never needs (or
  // should see) the technical distinction, just "unavailable, go manual".
  | { status: 'unavailable' }

export interface VinProvider {
  lookup(vin: string): Promise<VinLookupResult>
}

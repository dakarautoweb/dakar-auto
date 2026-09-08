import 'server-only'
import { normalizeVin, validateVin } from '@/src/lib/vin'
import { MockVinProvider } from './mock-vin-provider'
import type { VinLookupResult, VinProvider } from './types'

// Single place to swap the mock provider for a real one (e.g. Auto.dev)
// once an API key is available. The rest of the app only ever talks to
// lookupVehicleByVin — never to a specific provider implementation.
function createProvider(): VinProvider {
  return new MockVinProvider()
}

const provider = createProvider()

export async function lookupVehicleByVin(rawVin: string): Promise<VinLookupResult> {
  const vin = normalizeVin(rawVin)
  const validationError = validateVin(vin)
  if (validationError) {
    return { status: 'invalid', reason: validationError }
  }

  try {
    return await provider.lookup(vin)
  } catch {
    return { status: 'error' }
  }
}

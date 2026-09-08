import 'server-only'
import { DEMO_VIN_HONDA, DEMO_VIN_BMW, DEMO_VIN_TOYOTA, DEMO_VIN_MERCEDES } from './demo-vins'
import type { VehicleResult, VinLookupResult, VinProvider } from './types'

// Demo dataset standing in for a real VIN-decoding API (e.g. Auto.dev).
// Swap the provider returned by createProvider() in vin-service.ts once an
// API key is configured — the UI only ever depends on the VinProvider
// interface, never on this data directly.
const DEMO_VEHICLES: Record<string, Omit<VehicleResult, 'vin' | 'source'>> = {
  [DEMO_VIN_HONDA]: {
    year: 2003,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX',
    engine: '3.0L V6',
    transmission: 'Automatic',
    bodyStyle: 'Sedan',
    fuelType: 'Gasoline',
    drivetrain: 'FWD',
    imageUrl: null,
  },
  [DEMO_VIN_BMW]: {
    year: 2011,
    make: 'BMW',
    model: '5 Series',
    trim: '535i',
    engine: '3.0L Turbo I6',
    transmission: 'Automatic',
    bodyStyle: 'Sedan',
    fuelType: 'Gasoline',
    drivetrain: 'RWD',
    imageUrl: null,
  },
  [DEMO_VIN_TOYOTA]: {
    year: 2022,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE Hybrid',
    engine: '2.5L Hybrid I4',
    transmission: 'CVT Automatic',
    bodyStyle: 'SUV',
    fuelType: 'Hybrid',
    drivetrain: 'AWD',
    imageUrl: null,
  },
  [DEMO_VIN_MERCEDES]: {
    year: 2012,
    make: 'Mercedes-Benz',
    model: 'C-Class',
    trim: 'C300',
    engine: '3.5L V6',
    transmission: 'Automatic',
    bodyStyle: 'Sedan',
    fuelType: 'Gasoline',
    drivetrain: 'RWD',
    imageUrl: null,
  },
}

export class MockVinProvider implements VinProvider {
  async lookup(vin: string): Promise<VinLookupResult> {
    // Simulate network latency so the loading state is visible in the demo.
    await new Promise((resolve) => setTimeout(resolve, 600))

    const data = DEMO_VEHICLES[vin]
    if (!data) return { status: 'not_found' }

    return {
      status: 'found',
      vehicle: { vin, source: 'mock', ...data },
    }
  }
}

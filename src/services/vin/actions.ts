'use server'

import { lookupVehicleByVin } from './vin-service'
import type { VinLookupResult } from './types'

export async function identifyVinAction(rawVin: string): Promise<VinLookupResult> {
  return lookupVehicleByVin(rawVin)
}

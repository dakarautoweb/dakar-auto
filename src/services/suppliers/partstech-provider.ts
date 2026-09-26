import 'server-only'
import { isPartsTechConfigured } from './config'
import type {
  SupplierAvailabilityOutcome,
  SupplierPartDetailsOutcome,
  SupplierProvider,
  SupplierSearchOutcome,
  SupplierSearchQuery,
} from './types'

// Placeholder adapter — no real PartsTech network call exists yet, and none
// should be added until PartsTech's actual request/response contract has
// been documented to us (see the closing report item on the task this file
// was created for). Every method returns a typed, real (not fake) outcome:
// 'not_configured' when credentials are missing, 'not_implemented' when
// they're present but the request itself still isn't wired up. Filling in
// the 'not_implemented' branches below with a real fetch() is the only
// change a future integration needs — this class's shape, and every caller
// of it, stays the same.
export class PartsTechProvider implements SupplierProvider {
  readonly id = 'partstech' as const
  readonly name = 'PartsTech'

  isConfigured(): boolean {
    return isPartsTechConfigured()
  }

  async searchParts(_query: SupplierSearchQuery): Promise<SupplierSearchOutcome> {
    if (!this.isConfigured()) return { status: 'not_configured' }
    return { status: 'not_implemented' }
  }

  async checkAvailability(_partNumber: string): Promise<SupplierAvailabilityOutcome> {
    if (!this.isConfigured()) return { status: 'not_configured' }
    return { status: 'not_implemented' }
  }

  async getPartDetails(_partNumber: string): Promise<SupplierPartDetailsOutcome> {
    if (!this.isConfigured()) return { status: 'not_configured' }
    return { status: 'not_implemented' }
  }
}

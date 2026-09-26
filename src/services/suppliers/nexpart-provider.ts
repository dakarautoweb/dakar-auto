import 'server-only'
import { isNexpartConfigured } from './config'
import type {
  SupplierAvailabilityOutcome,
  SupplierPartDetailsOutcome,
  SupplierProvider,
  SupplierSearchOutcome,
  SupplierSearchQuery,
} from './types'

// Placeholder adapter — mirrors partstech-provider.ts exactly. No real
// Nexpart network call exists yet; every method returns 'not_configured'
// or 'not_implemented' until real API docs and credentials are available.
// Nexpart's auth pattern isn't documented to us yet and may end up being
// username/password rather than an API key (see NexpartCredentials in
// config.ts) — that only affects this file and config.ts, not the shared
// SupplierProvider contract or anything that calls it.
export class NexpartProvider implements SupplierProvider {
  readonly id = 'nexpart' as const
  readonly name = 'Nexpart'

  isConfigured(): boolean {
    return isNexpartConfigured()
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

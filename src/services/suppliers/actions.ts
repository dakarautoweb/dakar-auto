'use server'

import { requireAdmin } from '@/src/services/admin/auth'
import { getSupplierProviders } from './supplier-service'
import type { SupplierId, SupplierPartResult, SupplierSearchOutcome, SupplierSearchQuery } from './types'

export type SupplierSearchActionResult = {
  results: SupplierPartResult[]
  providerOutcomes: { id: SupplierId; name: string; outcome: SupplierSearchOutcome }[]
}

// Server-side only, per the brief: no PartsTech/Nexpart request or
// credential ever reaches the browser, and admin auth is re-checked here
// (not just trusted from the page render) since this is a distinct server
// entry point. Every provider outcome today is 'not_configured' or
// 'not_implemented' (see partstech-provider.ts / nexpart-provider.ts) —
// this action already runs the real fan-out across providers so wiring in
// live search later is only a matter of filling in their searchParts()
// bodies, not building a new call site.
export async function searchSuppliersAction(query: SupplierSearchQuery): Promise<SupplierSearchActionResult> {
  await requireAdmin()

  const trimmed: SupplierSearchQuery = {
    keyword: query.keyword.trim(),
    partNumber: query.partNumber.trim(),
    vin: query.vin.trim(),
  }

  const providers = getSupplierProviders()
  const providerOutcomes = await Promise.all(
    providers.map(async (provider) => ({
      id: provider.id,
      name: provider.name,
      outcome: await provider.searchParts(trimmed),
    }))
  )

  const results = providerOutcomes.flatMap((entry) => (entry.outcome.status === 'ok' ? entry.outcome.results : []))

  return { results, providerOutcomes }
}

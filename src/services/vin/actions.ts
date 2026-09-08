'use server'

import { headers } from 'next/headers'
import { lookupVehicleByVin } from './vin-service'
import { isRateLimited } from './rate-limit'
import type { VinLookupResult } from './types'

async function getClientKey(): Promise<string> {
  const headerList = await headers()
  // Behind Vercel/most proxies this is the real client IP as the first
  // entry; if it's absent we fall back to a shared bucket, which is
  // strictly more restrictive (not less) than per-client limiting.
  const forwardedFor = headerList.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return headerList.get('x-real-ip') ?? 'unknown'
}

export async function identifyVinAction(rawVin: string): Promise<VinLookupResult> {
  const clientKey = await getClientKey()
  if (isRateLimited(clientKey)) {
    // Same safe, generic message a customer would see for any other
    // provider hiccup — never reveal that this is a rate limit.
    return { status: 'unavailable' }
  }

  return lookupVehicleByVin(rawVin)
}

import 'server-only'
import { PartsTechProvider } from './partstech-provider'
import { NexpartProvider } from './nexpart-provider'
import type { SupplierProvider, SupplierProviderStatus } from './types'

// Single place that lists active suppliers, mirroring
// src/services/vin/vin-service.ts and src/services/car-image/car-image-service.ts.
// A future third provider is added here only — nothing else in this module
// imports a provider class directly.
const providers: SupplierProvider[] = [new PartsTechProvider(), new NexpartProvider()]

export function getSupplierProviders(): SupplierProvider[] {
  return providers
}

// Serializable status list for the admin page's provider cards — booleans
// derived from isConfigured(), never the credentials themselves.
export function getSupplierProviderStatuses(): SupplierProviderStatus[] {
  return providers.map((provider) => ({ id: provider.id, name: provider.name, configured: provider.isConfigured() }))
}

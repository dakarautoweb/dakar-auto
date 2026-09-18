import 'server-only'
import { getTrackingInfo } from './get-tracking-info'
import { getVehicleTrackingInfo } from './get-vehicle-tracking-info'
import type { TrackingInfo } from './types'
import type { VehicleTrackingInfo } from './vehicle-types'

export type PublicTrackingInfo = { kind: 'parts'; data: TrackingInfo } | { kind: 'vehicle'; data: VehicleTrackingInfo }

// /track/[token] has one route for both request types, and the token
// itself (a plain UUID) carries no type marker — so this probes parts
// first, then vehicle requests. getTrackingInfo is called exactly as it is
// everywhere else in the app and is never modified by this dispatcher.
export async function getPublicTrackingInfo(token: string): Promise<PublicTrackingInfo | null> {
  const parts = await getTrackingInfo(token)
  if (parts) return { kind: 'parts', data: parts }

  const vehicle = await getVehicleTrackingInfo(token)
  if (vehicle) return { kind: 'vehicle', data: vehicle }

  return null
}

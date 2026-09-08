// Pure types only — safe to import from both server and client code.

export type VehiclePhotoResult = {
  primaryImageUrl: string
  additionalImageUrls: string[]
  source: string
}

export type VehiclePhotoLookupResult =
  | { status: 'found'; photos: VehiclePhotoResult }
  | { status: 'not_found' }
  | { status: 'unavailable' }

export interface VehiclePhotosProvider {
  lookup(vin: string): Promise<VehiclePhotoLookupResult>
}

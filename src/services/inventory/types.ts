export const VEHICLE_STATUSES = ['available', 'reserved', 'sold', 'hidden'] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export function isVehicleStatus(value: string): value is VehicleStatus {
  return (VEHICLE_STATUSES as readonly string[]).includes(value)
}

// The only two statuses the public site (/vehicles, /vehicles/[id], the
// homepage featured section) is ever allowed to show — mirrors the
// "Public can read available or reserved vehicles" RLS policy so a bug here
// can't show a vehicle the database itself would already hide.
export const PUBLIC_VEHICLE_STATUSES: readonly VehicleStatus[] = ['available', 'reserved']

export type VehiclePhoto = {
  id: string
  url: string
  sortOrder: number
  isPrimary: boolean
}

export type AdminVehicle = {
  id: string
  make: string
  model: string
  year: number
  engineDisplacement: string | null
  color: string | null
  mileage: number | null
  descriptionFr: string | null
  descriptionEn: string | null
  optionsFr: string[]
  optionsEn: string[]
  price: number | null
  currency: string
  transmission: string | null
  fuelType: string | null
  vin: string | null
  status: VehicleStatus
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  photos: VehiclePhoto[]
}

// Public-facing shapes — already resolved to the caller's locale (no `Fr`/
// `En` suffixes left for the page/component to branch on), and never carry
// `vin` — the public site has no reason to expose it.
export type PublicVehicleSummary = {
  id: string
  make: string
  model: string
  year: number
  mileage: number | null
  engineDisplacement: string | null
  transmission: string | null
  color: string | null
  price: number | null
  currency: string
  status: VehicleStatus
  primaryPhotoUrl: string | null
}

export type PublicVehicleDetail = PublicVehicleSummary & {
  fuelType: string | null
  description: string | null
  options: string[]
  photos: VehiclePhoto[]
}

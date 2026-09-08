// Pure types only — safe to import from both server and client code.

export type PartSide = 'left' | 'right' | 'both'
export type PartCondition = 'oem' | 'aftermarket' | 'used' | 'no_preference'
export type PreferredContact = 'whatsapp' | 'phone' | 'email'

export type SubmitVehicleInput = {
  source: 'vin' | 'manual'
  vin: string | null
  year: number | null
  make: string
  model: string
  trim: string | null
  engine: string | null
  transmission: string | null
  bodyStyle: string | null
  fuelType: string | null
  drivetrain: string | null
  imageUrl: string | null
}

export type SubmitPartInput = {
  category: string
  partName: string
  side: PartSide | null
  condition: PartCondition
  quantity: number
  description: string
}

export type SubmitContactInput = {
  name: string
  email: string
  phone: string
  whatsappSameAsPhone: boolean
  whatsappPhone: string | null
  preferredContact: PreferredContact
}

export type SubmitPartsRequestInput = {
  vehicle: SubmitVehicleInput
  part: SubmitPartInput
  contact: SubmitContactInput
  locale: 'en' | 'fr'
}

export type SubmitPartsRequestResult =
  | { ok: true; requestNumber: string }
  | { ok: false; error: 'validation' | 'server_error'; message?: string }

import type { PartialVehicleResult, VehicleResult } from '@/src/services/vin/types'
import type { PartCondition, PartSide, PreferredContact } from '@/src/services/requests/types'
import type { AttachmentType } from '@/src/services/attachments/types'

export type WizardStep = 'vehicle' | 'parts' | 'contact' | 'review'

export type ConfirmedVehicle = {
  source: 'vin' | 'manual'
  // Which VIN provider actually produced this data ('auto_dev' | 'mock'),
  // null for manual entries. Kept separate from `source` (which only
  // distinguishes the wizard path, not the specific provider) so it can
  // be stored accurately in vehicles.vin_api_data.provider instead of
  // assuming a fixed value.
  identificationSource: string | null
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

export function vehicleResultToConfirmed(vehicle: VehicleResult): ConfirmedVehicle {
  return {
    source: 'vin',
    identificationSource: vehicle.source,
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    engine: vehicle.engine,
    transmission: vehicle.transmission,
    bodyStyle: vehicle.bodyStyle,
    fuelType: vehicle.fuelType,
    drivetrain: vehicle.drivetrain,
    imageUrl: vehicle.imageUrl,
  }
}

// What a partial VIN decode hands to the manual vehicle form: only the
// values the provider actually returned that the form can use. Model is
// never part of this — a partial match by definition has none.
export type PartialVinMatch = {
  vin: string
  make: string
  year: number | null
}

export function partialResultToMatch(vehicle: PartialVehicleResult): PartialVinMatch {
  return { vin: vehicle.vin, make: vehicle.make, year: vehicle.year }
}

export type PartFormState = {
  category: string
  partName: string
  side: PartSide | null
  condition: PartCondition
  quantity: number
  description: string
}

export type ContactFormState = {
  name: string
  email: string
  phone: string
  whatsappSameAsPhone: boolean
  whatsappPhone: string
  preferredContact: PreferredContact
}

export type UploadStatus = 'uploading' | 'uploaded' | 'failed'

export type SelectedPhoto = {
  id: string
  file: File
  previewUrl: string
  attachmentType: AttachmentType
  status: UploadStatus
  // 0-100, meaningful while status === 'uploading'.
  progress: number
  // Set once status === 'uploaded' — the signed reference sent at submit
  // time to finalize this exact object into a real attachment. Null while
  // uploading/failed.
  fileToken: string | null
}

// Display-only aggregate for the success screen, derived from the server's
// per-attachment FinalizedAttachmentResult[] after submit.
export type AttachmentSummary = {
  uploaded: number
  failed: number
}

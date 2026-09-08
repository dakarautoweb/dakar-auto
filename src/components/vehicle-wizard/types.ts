import type { VehicleResult } from '@/src/services/vin/types'
import type { PartCondition, PartSide, PreferredContact } from '@/src/services/requests/types'
import type { AttachmentType } from '@/src/services/attachments/types'

export type WizardStep = 'vehicle' | 'parts' | 'contact' | 'review'

export type ConfirmedVehicle = {
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

export function vehicleResultToConfirmed(vehicle: VehicleResult): ConfirmedVehicle {
  return {
    source: 'vin',
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

export type SelectedPhoto = {
  id: string
  file: File
  previewUrl: string
  attachmentType: AttachmentType
}

export type AttachmentSummary = {
  uploaded: number
  failed: number
}

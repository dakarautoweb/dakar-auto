// Pure types only — safe to import from both server and client code.

import type { PreferredContact } from '@/src/services/requests/types'

export type SubmitVehicleWantedInput = {
  make: string
  model: string
  yearFrom: number | null
  yearTo: number | null
  color: string
  engine: string
  transmission: string
  mileageMin: number | null
  mileageMax: number | null
  trimLevel: string
  budgetMin: number | null
  budgetMax: number | null
  currency: string
  otherPreferences: string
}

export type SubmitVehicleContactInput = {
  name: string
  email: string
  phone: string
  whatsappSameAsPhone: boolean
  whatsappPhone: string
  preferredContact: PreferredContact
}

export type SubmitVehicleRequestInput = {
  vehicle: SubmitVehicleWantedInput
  contact: SubmitVehicleContactInput
  locale: 'en' | 'fr'
}

export type SubmitVehicleRequestResult =
  | { ok: true; requestNumber: string }
  | { ok: false; error: 'validation' | 'server_error'; message?: string }

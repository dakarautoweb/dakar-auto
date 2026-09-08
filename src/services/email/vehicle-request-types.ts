import type { Locale } from '@/src/i18n/config'
import type { PreferredContact } from '@/src/services/requests/types'

export type VehicleRequestEmailData = {
  requestNumber: string
  locale: Locale
  submittedAt: Date
  vehicle: {
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
  contact: {
    name: string
    email: string | null
    phone: string
    whatsappPhone: string | null
    preferredContact: PreferredContact
  }
}

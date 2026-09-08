import type { Locale } from '@/src/i18n/config'
import type { PartCondition, PartSide, PreferredContact } from '@/src/services/requests/types'

export type PartsRequestEmailData = {
  requestNumber: string
  locale: Locale
  submittedAt: Date
  // Number of photos successfully uploaded and attached to the request.
  // Admin-only context — the customer confirmation doesn't mention it.
  attachmentCount?: number
  vehicle: {
    vin: string | null
    year: number | null
    make: string
    model: string
  }
  part: {
    categoryKey: string
    partName: string
    side: PartSide | null
    condition: PartCondition
    quantity: number
    description: string
  }
  contact: {
    name: string
    email: string | null
    phone: string
    whatsappPhone: string | null
    preferredContact: PreferredContact
  }
}

import 'server-only'
import type { Locale } from '@/src/i18n/config'
import { resolveFoundVehicleImageUrl } from '@/src/services/vehicle-request-matches/storage'
import { sendWhatsAppCustomerConfirmation } from './send-customer-confirmation'
import type { WhatsAppSendResult } from './send-template'

export type FoundVehicleWhatsAppData = {
  customerName: string
  requestNumber: string
  trackingToken: string
  locale: Locale
  whatsappPhone: string | null
  vehicle: {
    make: string
    model: string
    year: number
    price: number | null
    currency: string
    imageReference: { bucket: string; path: string } | null
  }
}

export function formatFoundVehiclePrice(price: number | null, currency: string, locale: Locale): string {
  if (price === null) return locale === 'en' ? 'Contact us for pricing' : 'Prix sur demande'
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-CA' : 'fr-CA', { maximumFractionDigits: 2 }).format(price)} ${currency}`
}

export function buildVehicleFoundParameters(data: FoundVehicleWhatsAppData): string[] {
  return [
    data.customerName,
    `${data.vehicle.make} ${data.vehicle.model}`,
    String(data.vehicle.year),
    formatFoundVehiclePrice(data.vehicle.price, data.vehicle.currency, data.locale),
  ]
}

export async function sendVehicleFoundWhatsApp(data: FoundVehicleWhatsAppData): Promise<WhatsAppSendResult> {
  const headerImageUrl = await resolveFoundVehicleImageUrl(data.vehicle.imageReference)
  return sendWhatsAppCustomerConfirmation({
    templateSet: 'vehicle_found',
    requestNumber: data.requestNumber,
    locale: data.locale,
    whatsappPhone: data.whatsappPhone,
    bodyParameters: buildVehicleFoundParameters(data),
    headerImageUrl,
    urlButtonParameter: data.trackingToken,
  })
}

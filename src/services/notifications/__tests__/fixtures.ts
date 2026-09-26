import type { PreferredContact } from '@/src/services/requests/types'
import type { PartsRequestNotificationData, VehicleRequestNotificationData } from '../types'

export function buildNotificationData(
  preferredContact: PreferredContact,
  overrides: Partial<PartsRequestNotificationData['contact']> = {}
): PartsRequestNotificationData {
  return {
    requestNumber: 'DA-2026-000123',
    trackingUrl: 'https://dakarauto.example/track/2f1c9a3e-0000-4000-8000-000000000000',
    locale: 'fr',
    submittedAt: new Date('2026-09-26T12:00:00Z'),
    attachmentCount: 0,
    vehicle: { vin: null, year: 2018, make: 'Toyota', model: 'Corolla' },
    part: {
      categoryKey: 'lighting',
      partName: 'Headlight',
      side: 'left',
      condition: 'oem',
      quantity: 1,
      description: '',
    },
    contact: {
      name: 'Awa Diop',
      email: 'awa@example.com',
      phone: '+221 77 123 45 67',
      whatsappPhone: '+221 77 123 45 67',
      preferredContact,
      ...overrides,
    },
  }
}

export function buildVehicleNotificationData(
  preferredContact: PreferredContact,
  overrides: Partial<VehicleRequestNotificationData['contact']> = {}
): VehicleRequestNotificationData {
  return {
    requestNumber: 'VR-2026-000123',
    trackingUrl: 'https://dakarauto.example/track/7a3b1c2d-0000-4000-8000-000000000000',
    locale: 'fr',
    submittedAt: new Date('2026-09-26T12:00:00Z'),
    vehicle: {
      make: 'Toyota',
      model: 'RAV4',
      yearFrom: 2018,
      yearTo: 2021,
      color: '',
      engine: '',
      transmission: '',
      mileageMin: null,
      mileageMax: null,
      trimLevel: '',
      budgetMin: null,
      budgetMax: null,
      currency: 'XOF',
      otherPreferences: '',
    },
    contact: {
      name: 'Awa Diop',
      email: 'awa@example.com',
      phone: '+221 77 123 45 67',
      whatsappPhone: '+221 77 123 45 67',
      preferredContact,
      ...overrides,
    },
  }
}

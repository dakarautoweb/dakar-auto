import { describe, expect, it } from 'vitest'
import { validateSubmitVehicleRequestInput } from '../validate'
import type { SubmitVehicleContactInput, SubmitVehicleRequestInput } from '../types'

function buildInput(contact: Partial<SubmitVehicleContactInput>): SubmitVehicleRequestInput {
  return {
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
      email: '',
      phone: '+221 77 123 45 67',
      whatsappSameAsPhone: true,
      whatsappPhone: '',
      preferredContact: 'phone',
      ...contact,
    },
    locale: 'fr',
  }
}

describe('validateSubmitVehicleRequestInput — contact method', () => {
  it.each(['5145820204', '(514) 582-0204', '+1 514 582 0204', '+221 77 123 45 67'])(
    'accepts WhatsApp using supported phone format %j',
    (phone) => {
      expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'whatsapp', phone }))).toBeNull()
    }
  )

  it('accepts WhatsApp with an international phone number reused as WhatsApp', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'whatsapp' }))).toBeNull()
  })

  it('accepts WhatsApp with a separate international WhatsApp number', () => {
    const input = buildInput({ preferredContact: 'whatsapp', phone: '77 123 45 67', whatsappSameAsPhone: false, whatsappPhone: '+1 514 555 1234' })
    expect(validateSubmitVehicleRequestInput(input)).toBeNull()
  })

  it('rejects WhatsApp when the separate number is empty', () => {
    const input = buildInput({ preferredContact: 'whatsapp', whatsappSameAsPhone: false, whatsappPhone: '  ' })
    expect(validateSubmitVehicleRequestInput(input)).toBe('missing_whatsapp_phone')
  })

  it('rejects WhatsApp with a local number reused from phone', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'whatsapp', phone: '77 123 45 67' }))).toBe('invalid_whatsapp_phone')
  })

  it('rejects WhatsApp with a local separate number', () => {
    const input = buildInput({ preferredContact: 'whatsapp', whatsappSameAsPhone: false, whatsappPhone: '06 12 34 56 78' })
    expect(validateSubmitVehicleRequestInput(input)).toBe('invalid_whatsapp_phone')
  })

  it('rejects email without an address', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'email', email: '' }))).toBe('missing_email')
  })

  it('rejects email with a malformed address', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'email', email: 'awa@' }))).toBe('invalid_email')
  })

  it('accepts email with a valid address', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'email', email: 'awa@example.com' }))).toBeNull()
  })

  it.each(['fr', 'en'] as const)('trims and accepts a valid Gmail address for locale %s', (locale) => {
    const input = buildInput({ preferredContact: 'email', email: '  sharofmk@gmail.com  ' })
    input.locale = locale
    expect(validateSubmitVehicleRequestInput(input)).toBeNull()
  })

  it('accepts phone with just name and a local phone number', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'phone', phone: '77 123 45 67' }))).toBeNull()
  })

  it('rejects phone without a phone number', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'phone', phone: '  ' }))).toBe('missing_phone')
  })

  it('still requires the phone for every method', () => {
    expect(validateSubmitVehicleRequestInput(buildInput({ preferredContact: 'email', email: 'awa@example.com', phone: '' }))).toBe('missing_phone')
  })
})

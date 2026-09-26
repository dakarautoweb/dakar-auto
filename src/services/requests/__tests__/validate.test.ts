import { describe, expect, it } from 'vitest'
import { validateSubmitPartsRequestInput } from '../validate'
import type { SubmitContactInput, SubmitPartsRequestInput } from '../types'

function buildInput(contact: Partial<SubmitContactInput>): SubmitPartsRequestInput {
  return {
    vehicle: {
      source: 'manual',
      identificationSource: null,
      vin: null,
      year: 2018,
      make: 'Toyota',
      model: 'Corolla',
      trim: null,
      engine: null,
      transmission: null,
      bodyStyle: null,
      fuelType: null,
      drivetrain: null,
      imageUrl: null,
    },
    part: { category: 'lighting', partName: 'Headlight', side: null, condition: 'oem', quantity: 1, description: '' },
    contact: {
      name: 'Awa Diop',
      email: '',
      phone: '+221 77 123 45 67',
      whatsappSameAsPhone: true,
      whatsappPhone: null,
      preferredContact: 'phone',
      ...contact,
    },
    locale: 'fr',
  }
}

describe('validateSubmitPartsRequestInput — contact method', () => {
  it('accepts WhatsApp with an international phone number reused as WhatsApp', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'whatsapp' }))).toBeNull()
  })

  it('accepts WhatsApp with a separate international WhatsApp number', () => {
    const input = buildInput({ preferredContact: 'whatsapp', phone: '77 123 45 67', whatsappSameAsPhone: false, whatsappPhone: '+1 514 555 1234' })
    expect(validateSubmitPartsRequestInput(input)).toBeNull()
  })

  it('rejects WhatsApp when the separate number is empty', () => {
    const input = buildInput({ preferredContact: 'whatsapp', whatsappSameAsPhone: false, whatsappPhone: '  ' })
    expect(validateSubmitPartsRequestInput(input)).toBe('missing_whatsapp_phone')
  })

  it('rejects WhatsApp with a local number reused from phone', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'whatsapp', phone: '77 123 45 67' }))).toBe('invalid_whatsapp_phone')
  })

  it('rejects email without an address', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'email', email: '' }))).toBe('missing_email')
  })

  it('rejects email with a malformed address', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'email', email: 'awa@' }))).toBe('invalid_email')
  })

  it('accepts email with a valid address', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'email', email: 'awa@example.com' }))).toBeNull()
  })

  it('accepts phone with just name and a local phone number', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'phone', phone: '77 123 45 67' }))).toBeNull()
  })

  it('still requires the phone for every method', () => {
    expect(validateSubmitPartsRequestInput(buildInput({ preferredContact: 'email', email: 'awa@example.com', phone: '' }))).toBe('missing_phone')
  })
})

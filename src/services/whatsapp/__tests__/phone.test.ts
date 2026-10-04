import { describe, expect, it } from 'vitest'
import { isValidWhatsAppRecipient, normalizeWhatsAppRecipient, resolveWhatsAppInput } from '../phone'

describe('normalizeWhatsAppRecipient', () => {
  it.each([
    ['5145820204', '15145820204'],
    ['514-582-0204', '15145820204'],
    ['(514) 582-0204', '15145820204'],
    ['+1 514 582 0204', '15145820204'],
    ['+1 514 555 1234', '15145551234'],
    ['+221 77 123 45 67', '221771234567'],
    ['1-514-555-1234', '15145551234'],
    ['+1 (514) 555-1234', '15145551234'],
    ['+33 6 12 34 56 78', '33612345678'],
    ['+221.77.123.45.67', '221771234567'],
    ['00221 77 123 45 67', '221771234567'],
    ['  +221771234567  ', '221771234567'],
    ['221771234567', '221771234567'],
  ])('normalizes %j → %s', (raw, expected) => {
    expect(normalizeWhatsAppRecipient(raw)).toBe(expected)
  })

  it('keeps every digit of a 15-digit number (no numeric conversion)', () => {
    expect(normalizeWhatsAppRecipient('+999 123 456 789 012')).toBe('999123456789012')
  })

  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['Senegal local mobile', '77 123 45 67'],
    ['French national format', '06 12 34 56 78'],
    ['country code starting with 0', '+0 221 77 123 45 67'],
    ['too short with +', '+1234567'],
    ['too long', '+1234567890123456'],
    ['letters', '+221 77 ABC 45 67'],
    ['plus in the middle', '221+771234567'],
    ['extension', '+1 514 555 1234 ext 12'],
    ['only formatting', '+ - ( )'],
  ])('rejects %s (%j)', (_label, raw) => {
    expect(normalizeWhatsAppRecipient(raw)).toBeNull()
    expect(isValidWhatsAppRecipient(raw)).toBe(false)
  })

  it.each([null, undefined])('rejects %j', (raw) => {
    expect(normalizeWhatsAppRecipient(raw)).toBeNull()
  })
})

describe('resolveWhatsAppInput', () => {
  it('uses the phone number when WhatsApp is the same as phone', () => {
    expect(resolveWhatsAppInput({ phone: ' +221 77 123 45 67 ', whatsappSameAsPhone: true, whatsappPhone: '+1 514 555 1234' })).toBe(
      '+221771234567'
    )
  })

  it('uses the separate WhatsApp number otherwise', () => {
    expect(resolveWhatsAppInput({ phone: '+221 77 123 45 67', whatsappSameAsPhone: false, whatsappPhone: '+1 514 555 1234' })).toBe(
      '+15145551234'
    )
  })

  it('returns an empty string when the separate number is missing', () => {
    expect(resolveWhatsAppInput({ phone: '+221 77 123 45 67', whatsappSameAsPhone: false, whatsappPhone: null })).toBe('')
  })
})

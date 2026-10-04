import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeContactPhone, normalizeContactValues } from '../contact-validation'

describe('contact normalization', () => {
  it.each([
    ['5145820204', '+15145820204'],
    ['514-582-0204', '+15145820204'],
    ['(514) 582-0204', '+15145820204'],
    ['+1 514 582 0204', '+15145820204'],
    ['+221 77 123 45 67', '+221771234567'],
  ])('normalizes %j to %s before submission', (raw, expected) => {
    expect(normalizeContactPhone(raw)).toBe(expected)
  })

  it('uses the normalized phone when WhatsApp is the same as phone', () => {
    expect(
      normalizeContactValues({
        name: ' Awa ',
        email: ' sharofmk@gmail.com ',
        phone: '(514) 582-0204',
        whatsappSameAsPhone: true,
        whatsappPhone: 'not-a-separate-input',
      })
    ).toEqual({
      name: 'Awa',
      email: 'sharofmk@gmail.com',
      phone: '+15145820204',
      whatsappSameAsPhone: true,
      whatsappPhone: '+15145820204',
    })
  })
})

describe('email validation', () => {
  it('trims and accepts a valid Gmail address', () => {
    expect(isValidEmail('  sharofmk@gmail.com  ')).toBe(true)
  })

  it('re-evaluates the current value so a corrected email has no stale error', () => {
    expect(isValidEmail('sharofmk@')).toBe(false)
    expect(isValidEmail('sharofmk@gmail.com')).toBe(true)
  })

  it.each(['sharofmk@', '@gmail.com', 'sharofmk gmail.com', 'sharofmk@gmail'])('still rejects malformed email %j', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })
})

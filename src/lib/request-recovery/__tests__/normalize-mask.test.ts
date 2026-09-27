import { describe, expect, it } from 'vitest'
import { lastNameMatches, normalizeEmail, normalizeName, normalizePhone, parseLastName, parseRecoveryContact, phonesMatch } from '../normalize'
import { maskEmail, maskPhone } from '../mask'

describe('email normalization', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Sophie.Diallo@Gmail.COM ')).toBe('sophie.diallo@gmail.com')
    expect(parseRecoveryContact(' Sophie@Gmail.com')).toEqual({ kind: 'email', email: 'sophie@gmail.com' })
  })

  it('rejects malformed emails', () => {
    expect(parseRecoveryContact('sophie@')).toBeNull()
    expect(parseRecoveryContact('a b@c.d')).toBeNull()
  })
})

describe('phone normalization', () => {
  it('reduces formatted numbers to canonical digits', () => {
    expect(normalizePhone('+221 77 123 45 67')).toBe('221771234567')
    expect(normalizePhone('00221 77-123-45-67')).toBe('221771234567')
    expect(parseRecoveryContact('(77) 123.45.67')).toEqual({ kind: 'phone', digits: '771234567' })
  })

  it('rejects too short, too long or non-phone input', () => {
    expect(parseRecoveryContact('12345')).toBeNull()
    expect(parseRecoveryContact('1234567890123456')).toBeNull()
    expect(parseRecoveryContact('77 abc 45')).toBeNull()
    expect(parseRecoveryContact('')).toBeNull()
    expect(parseRecoveryContact(undefined)).toBeNull()
  })

  it('matches the same number with or without the country code, exactly', () => {
    expect(phonesMatch('221771234567', '771234567')).toBe(true)
    expect(phonesMatch('771234567', '771234567')).toBe(true)
    expect(phonesMatch('221771234568', '771234567')).toBe(false)
    // A short local fragment is never enough.
    expect(phonesMatch('221771234567', '1234567')).toBe(false)
  })
})

describe('last-name normalization', () => {
  it('ignores case, accents, apostrophes and separators', () => {
    expect(normalizeName("  N'Diaye ")).toBe('ndiaye')
    expect(normalizeName('Sène-Faye')).toBe('sene faye')
    expect(parseLastName('Ba')).toBe('ba')
  })

  it('rejects empty or one-letter names', () => {
    expect(parseLastName(' ')).toBeNull()
    expect(parseLastName('D')).toBeNull()
    expect(parseLastName(42)).toBeNull()
  })

  it('matches whole words of the stored full name only', () => {
    expect(lastNameMatches('Mamadou Diop', 'diop')).toBe(true)
    expect(lastNameMatches('DIOP Mamadou', 'diop')).toBe(true)
    expect(lastNameMatches('Awa Sène Faye', normalizeName('Sene-Faye'))).toBe(true)
    expect(lastNameMatches('Mamadou Diopp', 'diop')).toBe(false)
    expect(lastNameMatches('Adiop Ba', 'diop')).toBe(false)
    expect(lastNameMatches(null, 'diop')).toBe(false)
  })
})

describe('masking', () => {
  it('masks an email down to its first letter and domain', () => {
    expect(maskEmail('sophie.diallo@gmail.com')).toBe('s•••••@gmail.com')
    expect(maskEmail('a@b.co')).toBe('a•••••@b.co')
    expect(maskEmail('sophie.diallo@gmail.com')).not.toContain('sophie')
  })

  it('masks a phone down to its last four digits', () => {
    expect(maskPhone('+221 77 123 45 67')).toBe('•••• •• 4567')
    expect(maskPhone('12')).toBe('•••• ••')
  })
})

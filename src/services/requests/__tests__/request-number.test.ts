import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { rpc } }))

import { MalformedRequestNumberError, generateRequestNumber, normalizeRequestNumber } from '../request-number'

const IN_2026 = new Date('2026-09-26T12:00:00Z')

describe('normalizeRequestNumber', () => {
  it.each([
    ['DA-123', 'DA-2026-000123'],
    ['DA-000123', 'DA-2026-000123'],
    ['DA-2026-000123', 'DA-2026-000123'],
    ['DA-1234567', 'DA-2026-1234567'],
    ['DA-2025-42', 'DA-2025-000042'],
    ['DA-2025-000999', 'DA-2025-000999'],
    ['DA-2026-1234567', 'DA-2026-1234567'],
    ['DA-1', 'DA-2026-000001'],
    ['DA-0000001', 'DA-2026-0000001'],
    ['DA-2026-000100', 'DA-2026-000100'],
  ])('normalizes %s → %s', (raw, expected) => {
    expect(normalizeRequestNumber(raw, IN_2026)).toBe(expected)
  })

  it('is idempotent', () => {
    const once = normalizeRequestNumber('DA-42', IN_2026)
    expect(normalizeRequestNumber(once, IN_2026)).toBe(once)
  })

  it('uses the UTC year at the new-year boundary', () => {
    // 00:30 UTC on Jan 1 is still Dec 31 in UTC-1 — the UTC year wins.
    expect(normalizeRequestNumber('DA-000001', new Date('2027-01-01T00:30:00Z'))).toBe('DA-2027-000001')
    expect(normalizeRequestNumber('DA-000001', new Date('2026-12-31T23:59:59Z'))).toBe('DA-2026-000001')
  })

  it.each([
    ['wrong prefix', 'ABC-123'],
    ['other request prefix', 'VR-000123'],
    ['lowercase prefix', 'da-123'],
    ['mixed-case prefix', 'Da-123'],
    ['non-digit sequence', 'DA-12A3'],
    ['non-digit sequence after year', 'DA-2026-12A3'],
    ['missing sequence', 'DA-'],
    ['missing sequence after year', 'DA-2026-'],
    ['two-digit year', 'DA-26-000123'],
    ['extra segment', 'DA-2026-000123-1'],
    ['surrounding whitespace', ' DA-000123 '],
    ['empty string', ''],
    ['missing prefix', '000123'],
    ['arbitrary text', 'hello world'],
    ['zero sequence', 'DA-0'],
    ['zero sequence (2 digits)', 'DA-00'],
    ['zero sequence (padded)', 'DA-000000'],
    ['zero sequence (wide)', 'DA-0000000'],
    ['zero sequence after year', 'DA-2026-0'],
    ['padded zero sequence after year', 'DA-2026-000000'],
  ])('rejects %s (%j)', (_label, raw) => {
    expect(() => normalizeRequestNumber(raw, IN_2026)).toThrow(MalformedRequestNumberError)
  })

  it.each([null, undefined, 123, {}])('rejects non-string value %j', (raw) => {
    expect(() => normalizeRequestNumber(raw, IN_2026)).toThrow(MalformedRequestNumberError)
  })
})

describe('generateRequestNumber', () => {
  beforeEach(() => {
    rpc.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(IN_2026)
    return () => vi.useRealTimers()
  })

  it('requests the DA sequence and returns the normalized value', async () => {
    rpc.mockResolvedValue({ data: 'DA-000123', error: null })
    await expect(generateRequestNumber()).resolves.toBe('DA-2026-000123')
    expect(rpc).toHaveBeenCalledWith('next_request_number', { p_prefix: 'DA' })
  })

  it('pads an unpadded RPC value', async () => {
    rpc.mockResolvedValue({ data: 'DA-123', error: null })
    await expect(generateRequestNumber()).resolves.toBe('DA-2026-000123')
  })

  it('passes through an already-final number', async () => {
    rpc.mockResolvedValue({ data: 'DA-2026-000123', error: null })
    await expect(generateRequestNumber()).resolves.toBe('DA-2026-000123')
  })

  it('throws on malformed RPC output instead of inventing a number', async () => {
    rpc.mockResolvedValue({ data: 'DA-12A', error: null })
    await expect(generateRequestNumber()).rejects.toThrow(MalformedRequestNumberError)
  })

  it('throws on a zero sequence from the RPC', async () => {
    rpc.mockResolvedValue({ data: 'DA-000000', error: null })
    await expect(generateRequestNumber()).rejects.toThrow(MalformedRequestNumberError)
  })

  it('rethrows RPC errors', async () => {
    const error = new Error('rpc failed')
    rpc.mockResolvedValue({ data: null, error })
    await expect(generateRequestNumber()).rejects.toBe(error)
  })
})

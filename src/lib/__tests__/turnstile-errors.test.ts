import { describe, expect, it } from 'vitest'
import { describeTurnstileError, isTurnstileTestSiteKey } from '../turnstile-errors'

describe('describeTurnstileError', () => {
  it.each(['110100', '110110', '110200', '400020', '400070'])('configuration error %s is not retryable', (code) => {
    expect(describeTurnstileError(code).retryable).toBe(false)
  })

  it('points a hostname error at Cloudflare hostname management', () => {
    expect(describeTurnstileError('110200').hint).toMatch(/hostname/i)
  })

  it.each(['300010', '300030', '600010', '200500', '110600', '200100', 'unknown', undefined, ''])('%s is retryable', (code) => {
    expect(describeTurnstileError(code).retryable).toBe(true)
  })
})

describe('isTurnstileTestSiteKey', () => {
  it.each(['1x00000000000000000000AA', '2x00000000000000000000AB', '3x00000000000000000000FF'])('detects dummy key %s', (key) => {
    expect(isTurnstileTestSiteKey(key)).toBe(true)
  })

  it('does not flag a real-looking key', () => {
    expect(isTurnstileTestSiteKey('0x4AAAAAAABkMYinukE8nzY')).toBe(false)
  })
})

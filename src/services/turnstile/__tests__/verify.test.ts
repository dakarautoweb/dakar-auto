import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstileToken } from '../verify'

// fetch is mocked throughout — this never calls Cloudflare's real
// siteverify endpoint. next/headers' headers() has no request context
// outside a running Next.js server; getClientIp() catches that and treats
// it as "no remote IP available," which is exactly what's exercised here.

const ORIGINAL_SECRET = process.env.TURNSTILE_SECRET_KEY

beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret'
})

afterEach(() => {
  process.env.TURNSTILE_SECRET_KEY = ORIGINAL_SECRET
  vi.unstubAllGlobals()
})

describe('verifyTurnstileToken', () => {
  it('fails safe on a missing token without calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyTurnstileToken(undefined)

    expect(result).toEqual({ ok: false, reason: 'missing_token' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails safe on a blank/whitespace token without calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyTurnstileToken('   ')

    expect(result).toEqual({ ok: false, reason: 'missing_token' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails safe when TURNSTILE_SECRET_KEY is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyTurnstileToken('some-token')

    expect(result).toEqual({ ok: false, reason: 'server_error' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns ok on a successful siteverify response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, hostname: 'dakarauto.com' }) })
    )

    const result = await verifyTurnstileToken('valid-token')

    expect(result).toEqual({ ok: true })
  })

  it('rejects when Cloudflare reports success: false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) })
    )

    const result = await verifyTurnstileToken('bad-token')

    expect(result).toEqual({ ok: false, reason: 'invalid_token' })
  })

  it('treats a non-2xx HTTP response from siteverify as a server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }))

    const result = await verifyTurnstileToken('some-token')

    expect(result).toEqual({ ok: false, reason: 'server_error' })
  })

  it('treats a network throw as a server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await verifyTurnstileToken('some-token')

    expect(result).toEqual({ ok: false, reason: 'server_error' })
  })

  it('treats an aborted (timed out) request as a timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        return Promise.reject(err)
      })
    )

    const result = await verifyTurnstileToken('some-token')

    expect(result).toEqual({ ok: false, reason: 'timeout' })
  })
})

describe('Turnstile diagnostics', () => {
  it('categorizes siteverify rejections so logs tell secret vs token problems apart', async () => {
    const { categorizeSiteverifyErrors } = await import('../verify')
    expect(categorizeSiteverifyErrors(['invalid-input-secret'])).toBe('secret_invalid')
    expect(categorizeSiteverifyErrors(['missing-input-secret'])).toBe('secret_invalid')
    expect(categorizeSiteverifyErrors(['timeout-or-duplicate'])).toBe('token_expired_or_reused')
    expect(categorizeSiteverifyErrors(['invalid-input-response'])).toBe('token_invalid')
    expect(categorizeSiteverifyErrors([])).toBe('other')
  })

  it('logs the category — never the token or secret — and still fails closed', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-value-never-logged'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, 'error-codes': ['invalid-input-secret'] }) }))
    const logged: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void logged.push(args.join(' ')))

    const result = await verifyTurnstileToken('token-value-never-logged')

    expect(result).toEqual({ ok: false, reason: 'invalid_token' })
    expect(logged.join('\n')).toContain('category=secret_invalid')
    expect(logged.join('\n')).not.toContain('secret-value-never-logged')
    expect(logged.join('\n')).not.toContain('token-value-never-logged')
    spy.mockRestore()
  })

  it('trims a secret pasted with a trailing newline before sending it', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'real-secret\n'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    await verifyTurnstileToken('token')

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams
    expect(body.get('secret')).toBe('real-secret')
  })

  it('treats a whitespace-only secret as not configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = '  \n'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await verifyTurnstileToken('token')).toEqual({ ok: false, reason: 'server_error' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

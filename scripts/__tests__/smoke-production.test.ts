import { describe, expect, it } from 'vitest'
import { buildChecks, resolveBaseUrl, runChecks } from '../smoke-production.mjs'

describe('production smoke suite', () => {
  it('targets an explicit URL, else SMOKE_BASE_URL, else NEXT_PUBLIC_APP_URL', () => {
    expect(resolveBaseUrl(['https://a.example/'], { NEXT_PUBLIC_APP_URL: 'https://b.example' })).toBe('https://a.example')
    expect(resolveBaseUrl([], { SMOKE_BASE_URL: 'https://s.example', NEXT_PUBLIC_APP_URL: 'https://b.example' })).toBe('https://s.example')
    expect(resolveBaseUrl([], { NEXT_PUBLIC_APP_URL: 'https://b.example//' })).toBe('https://b.example')
    expect(resolveBaseUrl([], {})).toBeNull()
  })

  it('counts FAILs (including thrown errors) and never SKIPs', async () => {
    const lines: string[] = []
    const failed = await runChecks(
      [
        { name: 'ok', run: async () => ({ level: 'PASS' }) },
        { name: 'skipped', run: async () => ({ level: 'SKIP', detail: 'manual' }) },
        { name: 'broken', run: async () => ({ level: 'FAIL', detail: 'HTTP 503 unavailable' }) },
        {
          name: 'network',
          run: async () => {
            throw new TypeError('fetch failed for https://secret.example/?key=abc')
          },
        },
      ],
      (line: string) => lines.push(line),
    )
    expect(failed).toBe(2)
    expect(lines).toEqual(['PASS ok', 'SKIP skipped — manual', 'FAIL broken — HTTP 503 unavailable', 'FAIL network — request failed (TypeError)'])
  })

  it('covers the mandatory checks, and only pays for photo AI when enabled', () => {
    const names = buildChecks('https://x.example', {}).map((c: { name: string }) => c.name)
    for (const expected of ['page /', 'page /parts', 'page /vehicles', 'page /source-a-vehicle', 'page /track', 'page /faq', 'recovery backend lookup', 'AI chat']) {
      expect(names.some((n: string) => n.startsWith(expected))).toBe(true)
    }
    expect(names).toContain('photo AI real recognition')
    expect(names).not.toContain('photo AI — real OpenAI image request')
    expect(buildChecks('https://x.example', { PART_RECOGNITION_SMOKE: '1' }).map((c: { name: string }) => c.name)).toContain('photo AI — real OpenAI image request')
  })
})

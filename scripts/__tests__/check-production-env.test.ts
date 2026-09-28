import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkProductionEnv, formatResults } from '../check-production-env.mjs'

const SCRIPT = path.resolve(__dirname, '../check-production-env.mjs')
const REF = 'abcdefghijklmnopqrst'

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}.signature-${payload.role}`
}

const VALID: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'anon', ref: REF }),
  SUPABASE_SERVICE_ROLE_KEY: jwt({ role: 'service_role', ref: REF }),
  OPENAI_API_KEY: 'sk-proj-SECRETOPENAIVALUE',
  OPENAI_CHAT_MODEL: 'chat-model-name',
  OPENAI_PART_RECOGNITION_MODEL: 'vision-model-name',
  REQUEST_RECOVERY_SECRET: 'RECOVERYSECRET-0123456789abcdefghijklmnop',
  RESEND_API_KEY: 're_SECRETRESENDVALUE',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAASITEKEYVALUE',
  TURNSTILE_SECRET_KEY: '0x4AAAAAAASECRETTURNSTILEVALUE',
  NEXT_PUBLIC_APP_URL: 'https://dakar-auto.example',
  RESEND_FROM_EMAIL: 'Dakar Auto <noreply@dakar-auto.example>',
}

function failures(env: Record<string, string | undefined>) {
  return Object.fromEntries(checkProductionEnv(env).results.filter((r: { level: string }) => r.level === 'FAIL').map((r: { name: string; reason: string | null }) => [r.name, r.reason]))
}

describe('production env checker', () => {
  it('passes a complete, well-formed production env', () => {
    const { ok, results } = checkProductionEnv(VALID)
    expect(ok).toBe(true)
    expect(results.every((r: { level: string }) => r.level === 'PASS')).toBe(true)
  })

  it('fails every missing required variable', () => {
    const { ok, results } = checkProductionEnv({})
    expect(ok).toBe(false)
    const failed = results.filter((r: { level: string }) => r.level === 'FAIL').map((r: { name: string }) => r.name)
    expect(failed).toEqual(expect.arrayContaining(['REQUEST_RECOVERY_SECRET', 'RESEND_API_KEY', 'OPENAI_API_KEY', 'OPENAI_CHAT_MODEL', 'OPENAI_PART_RECOGNITION_MODEL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']))
  })

  it('rejects a recovery secret shorter than 32 characters (after trimming)', () => {
    expect(failures({ ...VALID, REQUEST_RECOVERY_SECRET: `  ${'x'.repeat(31)}  ` }).REQUEST_RECOVERY_SECRET).toMatch(/shorter than 32/)
  })

  it('rejects empty, quoted and multi-line values that "exist" in the UI', () => {
    expect(failures({ ...VALID, RESEND_API_KEY: '   ' }).RESEND_API_KEY).toMatch(/empty/)
    expect(failures({ ...VALID, REQUEST_RECOVERY_SECRET: `"${VALID.REQUEST_RECOVERY_SECRET}"` }).REQUEST_RECOVERY_SECRET).toMatch(/quotes/)
    expect(failures({ ...VALID, OPENAI_API_KEY: 'sk-abc\nsk-def' }).OPENAI_API_KEY).toMatch(/line break/)
  })

  it('rejects Cloudflare test keys and malformed provider keys', () => {
    expect(failures({ ...VALID, NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }).NEXT_PUBLIC_TURNSTILE_SITE_KEY).toMatch(/TEST/)
    expect(failures({ ...VALID, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }).TURNSTILE_SECRET_KEY).toMatch(/TEST/)
    expect(failures({ ...VALID, RESEND_API_KEY: 'abc' }).RESEND_API_KEY).toBeTruthy()
    expect(failures({ ...VALID, OPENAI_API_KEY: 'abc' }).OPENAI_API_KEY).toBeTruthy()
  })

  it('catches a service-role key in the public anon slot and keys from another project', () => {
    expect(failures({ ...VALID, NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID.SUPABASE_SERVICE_ROLE_KEY }).NEXT_PUBLIC_SUPABASE_ANON_KEY).toMatch(/SERVICE ROLE/)
    expect(failures({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: jwt({ role: 'service_role', ref: 'otherprojectref00000' }) }).SUPABASE_SERVICE_ROLE_KEY).toMatch(/different Supabase project/)
    expect(failures({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: VALID.NEXT_PUBLIC_SUPABASE_ANON_KEY }).SUPABASE_SERVICE_ROLE_KEY).toMatch(/not a service-role/)
  })

  it('requires a public https app URL for email links', () => {
    expect(failures({ ...VALID, NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }).NEXT_PUBLIC_APP_URL).toBeTruthy()
    expect(failures({ ...VALID, NEXT_PUBLIC_APP_URL: 'https://localhost:3000' }).NEXT_PUBLIC_APP_URL).toMatch(/localhost/)
  })

  it('only warns (does not fail) for the Resend fallback sender', () => {
    const { ok, results } = checkProductionEnv({ ...VALID, RESEND_FROM_EMAIL: undefined })
    expect(ok).toBe(true)
    expect(results.find((r: { name: string }) => r.name === 'RESEND_FROM_EMAIL')?.level).toBe('WARN')
  })

  it('never prints a value, valid or invalid', () => {
    const invalid = { ...VALID, REQUEST_RECOVERY_SECRET: 'SHORTSECRETVALUE', OPENAI_API_KEY: '"sk-QUOTEDSECRETVALUE"', RESEND_API_KEY: 'NOTARESENDSECRETVALUE' }
    for (const env of [VALID, invalid]) {
      const output = formatResults(checkProductionEnv(env).results).join('\n')
      for (const value of Object.values(env)) expect(output).not.toContain(value)
      expect(output).not.toMatch(/SECRET\w*VALUE|SITEKEYVALUE/)
    }
  })
})

describe('check-production-env CLI', () => {
  function run(env: Record<string, string>, args: string[] = []) {
    const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !(k in VALID) && k !== 'VERCEL_ENV'))
    return spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...clean, ...env } as NodeJS.ProcessEnv, encoding: 'utf8' })
  }

  it('is skipped outside Vercel production builds, so local `npm run build` needs no secrets', () => {
    const result = run({}, ['--if-production'])
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/^SKIP/)
  })

  it('fails a Vercel production build with invalid config — without printing values', () => {
    const env = { ...VALID, REQUEST_RECOVERY_SECRET: 'SHORTSECRETVALUE', VERCEL_ENV: 'production' }
    const result = run(env, ['--if-production'])
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('FAIL REQUEST_RECOVERY_SECRET')
    for (const value of Object.values(env)) if (value !== 'production') expect(result.stdout + result.stderr).not.toContain(value)
  })

  it('passes a Vercel production build with valid config', () => {
    const result = run({ ...VALID, VERCEL_ENV: 'production' }, ['--if-production'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Production environment: OK')
    for (const value of Object.values(VALID)) expect(result.stdout).not.toContain(value)
  })
})

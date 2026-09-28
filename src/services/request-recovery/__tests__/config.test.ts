import { describe, expect, it } from 'vitest'
import { getChatConfig } from '@/src/services/chat/config'
import { diagnoseRecoveryConfig, getRecoveryConfigStatus, MIN_RECOVERY_SECRET_LENGTH } from '../config'

const VALID_SECRET = 'r'.repeat(MIN_RECOVERY_SECRET_LENGTH)

function env(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    REQUEST_RECOVERY_SECRET: VALID_SECRET,
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'Dakar Auto <noreply@example.com>',
    NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    ...overrides,
  }
}

describe('recovery runtime configuration', () => {
  it('is ready with a valid secret, a Resend client and Supabase admin access', () => {
    const status = getRecoveryConfigStatus(env(), true)
    expect(status).toMatchObject({ ok: true, secret: VALID_SECRET })
  })

  it('reports a missing REQUEST_RECOVERY_SECRET', () => {
    const status = getRecoveryConfigStatus(env({ REQUEST_RECOVERY_SECRET: undefined }), true)
    expect(status.ok).toBe(false)
    if (!status.ok) expect(status.problems).toEqual(['recovery_secret_missing'])
  })

  it('treats an empty / whitespace / newline-only secret as missing', () => {
    for (const value of ['', '   ', '\n', '\r\n']) {
      const status = getRecoveryConfigStatus(env({ REQUEST_RECOVERY_SECRET: value }), true)
      expect(status.ok ? [] : status.problems).toEqual(['recovery_secret_missing'])
    }
  })

  it('reports a secret shorter than 32 characters', () => {
    const status = getRecoveryConfigStatus(env({ REQUEST_RECOVERY_SECRET: 'r'.repeat(MIN_RECOVERY_SECRET_LENGTH - 1) }), true)
    expect(status.ok ? [] : status.problems).toEqual(['recovery_secret_too_short'])
  })

  it('measures the length after trimming, so padding cannot make a short secret pass', () => {
    const status = getRecoveryConfigStatus(env({ REQUEST_RECOVERY_SECRET: `  ${'r'.repeat(20)}  \n` }), true)
    expect(status.ok ? [] : status.problems).toEqual(['recovery_secret_too_short'])
    expect(getRecoveryConfigStatus(env({ REQUEST_RECOVERY_SECRET: `\n${VALID_SECRET}\n` }), true)).toMatchObject({ ok: true, secret: VALID_SECRET })
  })

  it('flags a quoted secret in the diagnostics', () => {
    expect(diagnoseRecoveryConfig(env({ REQUEST_RECOVERY_SECRET: `"${VALID_SECRET}"` }), true).recoverySecretQuoted).toBe(true)
    expect(diagnoseRecoveryConfig(env(), true).recoverySecretQuoted).toBe(false)
  })

  it('reports a missing RESEND_API_KEY (including whitespace-only)', () => {
    for (const value of [undefined, '', '  ']) {
      const status = getRecoveryConfigStatus(env({ RESEND_API_KEY: value }), false)
      expect(status.ok ? [] : status.problems).toEqual(['resend_api_key_missing'])
    }
  })

  it('reports a key that is present but produced no Resend client', () => {
    const status = getRecoveryConfigStatus(env(), false)
    expect(status.ok ? [] : status.problems).toEqual(['resend_client_missing'])
  })

  it('reports missing Supabase admin configuration', () => {
    const status = getRecoveryConfigStatus(env({ NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: '' }), true)
    expect(status.ok ? [] : status.problems).toEqual(['supabase_url_missing', 'service_role_missing'])
  })

  it('lists every problem at once, not just the first', () => {
    const status = getRecoveryConfigStatus({}, false)
    expect(status.ok ? [] : status.problems).toEqual(['recovery_secret_missing', 'resend_api_key_missing', 'supabase_url_missing', 'service_role_missing'])
  })

  it('diagnostics are booleans only — never a value', () => {
    const diagnostics = diagnoseRecoveryConfig(env({ REQUEST_RECOVERY_SECRET: 'short-secret-value' }), true)
    for (const value of Object.values(diagnostics)) expect(typeof value).toBe('boolean')
    expect(JSON.stringify(diagnostics)).not.toContain('short-secret-value')
    expect(JSON.stringify(diagnostics)).not.toContain('re_test_key')
  })

  it('reports the Resend fallback sender', () => {
    expect(diagnoseRecoveryConfig(env({ RESEND_FROM_EMAIL: undefined }), true).resendFromUsesFallback).toBe(true)
    expect(diagnoseRecoveryConfig(env(), true).resendFromUsesFallback).toBe(false)
  })
})

describe('recovery and AI configuration are independent', () => {
  it('recovery does not depend on OpenAI configuration', () => {
    expect(getRecoveryConfigStatus(env({ OPENAI_API_KEY: undefined, OPENAI_CHAT_MODEL: undefined }), true).ok).toBe(true)
  })

  it('the AI assistant does not depend on recovery configuration', () => {
    const saved = { ...process.env }
    try {
      delete process.env.REQUEST_RECOVERY_SECRET
      delete process.env.RESEND_API_KEY
      process.env.OPENAI_API_KEY = 'sk-test'
      expect(getChatConfig()).not.toBeNull()
    } finally {
      process.env = saved
    }
  })
})

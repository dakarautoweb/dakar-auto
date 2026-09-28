import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Drives the real /api/chat/recovery handler and the real Supabase
// repository; only the Supabase client and the email transport are faked.
// Everything recorded here is what the production code actually asked for.

type TableResult = { data?: unknown[]; error?: { message: string; code?: string } }
type Call = { table: string; select?: string; ops: string[]; args: unknown[][] }

const h = vi.hoisted(() => {
  const state = {
    tables: {} as Record<string, TableResult>,
    calls: [] as Call[],
  }
  function builder(table: string) {
    const call: Call = { table, ops: [], args: [] }
    state.calls.push(call)
    const outcome = () => {
      const result = state.tables[table] ?? {}
      return { data: result.error ? null : (result.data ?? []), error: result.error ?? null, count: 0 }
    }
    const proxy: unknown = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'then') return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(outcome()).then(resolve, reject)
          return (...args: unknown[]) => {
            if (prop === 'select' && call.select === undefined) call.select = args[0] as string
            call.ops.push(String(prop))
            call.args.push(args)
            return proxy
          }
        },
      },
    )
    return proxy
  }
  return { state, builder, sendCode: vi.fn<(email: string, data: unknown) => Promise<boolean>>(async () => true) }
})

vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from: (table: string) => h.builder(table) } }))
vi.mock('@/src/services/email', () => ({ sendRequestRecoveryCodeEmail: h.sendCode }))
vi.mock('@/src/services/email/config', () => ({ resendClient: {}, EMAIL_FROM: 'test', EMAIL_FROM_USES_FALLBACK: false }))
// The recovery endpoint must never load the AI provider.
vi.mock('openai', () => {
  throw new Error('the recovery flow must never import openai')
})

const { handleRecoveryRequest } = await import('../handle-request')
const { CANDIDATE_SOURCES } = await import('../repository')

const SECRET = 's'.repeat(40)
const RESEND_KEY = 're_live_do_not_print_me'
const SERVICE_ROLE = 'service-role-do-not-print-me'
const CONTACT = 'sophie.diallo@gmail.com'
const LAST_NAME = 'Diallo'

let ip = 0
function post(body: unknown): Request {
  ip += 1
  return new Request('http://localhost/api/chat/recovery', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${ip}` },
    body: JSON.stringify(body),
  })
}

async function call(body: unknown) {
  const response = await handleRecoveryRequest(post(body))
  return { status: response.status, body: await response.json() }
}

let errors: string[]

beforeEach(() => {
  h.state.tables = {}
  h.state.calls = []
  h.sendCode.mockReset()
  h.sendCode.mockResolvedValue(true)
  vi.stubEnv('REQUEST_RECOVERY_SECRET', SECRET)
  vi.stubEnv('RESEND_API_KEY', RESEND_KEY)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE)
  vi.stubEnv('OPENAI_API_KEY', '')
  errors = []
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function expectNoSecretsOrPiiLogged() {
  const log = errors.join('\n')
  for (const value of [SECRET, RESEND_KEY, SERVICE_ROLE, CONTACT, LAST_NAME]) expect(log).not.toContain(value)
}

describe('runtime configuration is decided by the endpoint', () => {
  it('status → ready when configured, without OpenAI configured', async () => {
    expect(await call({ action: 'status', locale: 'fr' })).toEqual({ status: 200, body: { status: 'ready' } })
    expect(h.state.calls).toEqual([])
  })

  // The production regression: recovery was switched off by a page-render
  // check that never logged anything. A broken config must now surface as a
  // logged reason on the endpoint, while the client sees only "unavailable".
  it.each([
    ['REQUEST_RECOVERY_SECRET', '', 'recovery_secret_missing', '"recoverySecretPresent":false'],
    ['REQUEST_RECOVERY_SECRET', 'too-short-secret-value', 'recovery_secret_too_short', '"recoverySecretLengthValid":false'],
    ['RESEND_API_KEY', '', 'resend_api_key_missing', '"resendApiKeyPresent":false'],
    ['SUPABASE_SERVICE_ROLE_KEY', '', 'service_role_missing', '"serviceRolePresent":false'],
  ])('%s=%j → generic unavailable, exact reason logged', async (name, value, problem, flag) => {
    vi.stubEnv(name, value)
    for (const action of ['status', 'lookup']) {
      errors = []
      const result = await call({ action, contact: CONTACT, lastName: LAST_NAME, locale: 'fr' })
      expect(result).toEqual({ status: 503, body: { status: 'unavailable' } })
      expect(errors.join('\n')).toContain('[request-recovery] unavailable: configuration invalid')
      expect(errors.join('\n')).toContain(problem)
      expect(errors.join('\n')).toContain(flag)
      expect(errors.join('\n')).not.toContain('too-short-secret-value')
      expectNoSecretsOrPiiLogged()
    }
    expect(h.state.calls).toEqual([])
    expect(h.sendCode).not.toHaveBeenCalled()
  })

  it('the site layout no longer hides recovery based on a render-time config check', () => {
    const layout = readFileSync(path.resolve(__dirname, '../../../../app/(site)/layout.tsx'), 'utf8')
    expect(layout).not.toMatch(/recoveryEnabled|isRecoveryConfigured/)
  })
})

describe('lookup against the real repository', () => {
  it('impossible identity → not_found after querying BOTH request tables', async () => {
    const result = await call({ action: 'lookup', contact: 'smoke-1a2b3c@example.invalid', lastName: 'SmokeNeverExists', locale: 'fr' })
    expect(result).toEqual({ status: 200, body: { status: 'not_found' } })
    expect(h.state.calls.map((c) => c.table).sort()).toEqual(['parts_requests', 'vehicle_requests'])
    expect(h.state.calls.find((c) => c.table === 'parts_requests')?.select).toBe(CANDIDATE_SOURCES.parts.columns)
    expect(h.state.calls.find((c) => c.table === 'vehicle_requests')?.select).toBe(CANDIDATE_SOURCES.vehicle.columns)
    expect(h.sendCode).not.toHaveBeenCalled()
  })

  it('phone lookup filters each table on its own phone columns', async () => {
    const result = await call({ action: 'lookup', contact: '+221 77 123 45 67', lastName: 'SmokeNeverExists', locale: 'fr' })
    expect(result.body).toEqual({ status: 'not_found' })
    for (const kind of ['parts', 'vehicle'] as const) {
      const c = h.state.calls.find((x) => x.table === CANDIDATE_SOURCES[kind].table)!
      const filter = c.args[c.ops.indexOf('or')][0] as string
      for (const column of CANDIDATE_SOURCES[kind].phoneColumns) expect(filter).toContain(`${column}.ilike.`)
    }
  })

  it.each(['parts_requests', 'vehicle_requests'])('a %s query error → unavailable (never a silent partial not_found)', async (table) => {
    h.state.tables[table] = { error: { code: '42703', message: 'column does not exist' } }
    const result = await call({ action: 'lookup', contact: CONTACT, lastName: LAST_NAME, locale: 'fr' })
    expect(result).toEqual({ status: 503, body: { status: 'unavailable' } })
    const kind = table === 'parts_requests' ? 'parts' : 'vehicle'
    expect(errors.join('\n')).toContain(`candidate lookup (${kind}) failed`)
    expect(errors.join('\n')).toContain('recovery_lookup_failed')
    expectNoSecretsOrPiiLogged()
  })

  it('a match whose email cannot be delivered → delivery_failed (not unavailable), code invalidated', async () => {
    h.state.tables.parts_requests = {
      data: [{ id: 'p1', created_at: new Date().toISOString(), customer_name: 'Sophie Diallo', customer_email: CONTACT, customer_phone: null, whatsapp_phone: null }],
    }
    h.sendCode.mockResolvedValue(false)
    const result = await call({ action: 'lookup', contact: CONTACT, lastName: LAST_NAME, locale: 'fr' })
    expect(result).toEqual({ status: 200, body: { status: 'delivery_failed' } })
    const challengeOps = h.state.calls.filter((c) => c.table === 'request_recovery_challenges').flatMap((c) => c.ops)
    expect(challengeOps).toContain('insert')
    expect(challengeOps).toContain('update')
    expectNoSecretsOrPiiLogged()
  })

  it('a deliverable match → code_sent with a masked destination only', async () => {
    h.state.tables.vehicle_requests = {
      data: [{ id: 'v1', created_at: new Date().toISOString(), customer_name: 'Sophie Diallo', customer_email: CONTACT, customer_phone: null, whatsapp_phone: null }],
    }
    const result = await call({ action: 'lookup', contact: CONTACT, lastName: LAST_NAME, locale: 'fr' })
    expect(result.status).toBe(200)
    expect(result.body.status).toBe('code_sent')
    expect(JSON.stringify(result.body)).not.toContain(CONTACT)
    expect(h.sendCode).toHaveBeenCalledTimes(1)
    expect(h.sendCode.mock.calls[0][0]).toBe(CONTACT)
  })
})

describe('request-table adapters', () => {
  it('each table has its own adapter that tags its own kind', () => {
    expect(CANDIDATE_SOURCES.parts.table).toBe('parts_requests')
    expect(CANDIDATE_SOURCES.vehicle.table).toBe('vehicle_requests')
    expect(CANDIDATE_SOURCES.parts).not.toBe(CANDIDATE_SOURCES.vehicle)
    const row = { id: 7, created_at: '2026-09-01T00:00:00Z', customer_name: 'A B', customer_email: 'a@b.c', customer_phone: '+221 77 000 00 00', whatsapp_phone: '' }
    expect(CANDIDATE_SOURCES.parts.toCandidate(row)).toMatchObject({ kind: 'parts', requestId: '7', phones: ['+221 77 000 00 00'] })
    expect(CANDIDATE_SOURCES.vehicle.toCandidate(row)).toMatchObject({ kind: 'vehicle', requestId: '7', phones: ['+221 77 000 00 00'] })
  })

  it('tolerates a row without optional contact columns', () => {
    const candidate = CANDIDATE_SOURCES.vehicle.toCandidate({ id: 'v', created_at: '2026-09-01T00:00:00Z' })
    expect(candidate).toMatchObject({ customerName: null, email: null, phones: [] })
  })

  it('every column an adapter maps is one it selects', () => {
    for (const source of Object.values(CANDIDATE_SOURCES)) {
      const selected = source.columns.split(',').map((c) => c.trim())
      for (const column of [source.emailColumn, ...source.phoneColumns, 'id', 'created_at', 'customer_name']) expect(selected).toContain(column)
    }
  })
})

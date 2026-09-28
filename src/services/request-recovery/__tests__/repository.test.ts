import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Unlike handle-request.test.ts, nothing Supabase-side is mocked here: the
// real supabase-js client builds the real PostgREST requests, and only the
// network (fetch) is answered by a small PostgREST stand-in. That is what
// catches query-serialization bugs like the one found in production on
// 2026-09-27: `.contains('request_refs', [ref])` was sent as the Postgres
// array literal `cs.{[object Object]}`, PostgREST answered HTTP 400, and
// every lookup that found a real match ended in "unavailable".

const h = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghijklmnopqrst.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  const state = {
    requests: [] as { method: string; table: string; params: URLSearchParams }[],
    rows: {} as Record<string, unknown[]>,
    failHead: false,
  }
  const fakePostgrest = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const table = url.pathname.split('/').pop() ?? ''
    state.requests.push({ method, table, params: url.searchParams })
    // Observed against the real database: a Postgres array literal on the
    // jsonb request_refs column is rejected with an empty-bodied 400.
    for (const [key, value] of url.searchParams) {
      if (key === 'request_refs' && value.startsWith('cs.{')) return new Response(null, { status: 400 })
    }
    if (method === 'HEAD' && state.failHead) return new Response(null, { status: 400 })
    if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '*/0' } })
    if (method === 'POST') return new Response(null, { status: 201 })
    if (method === 'PATCH') return Response.json([{ id: 'x' }])
    return Response.json(state.rows[table] ?? [])
  }
  globalThis.fetch = fakePostgrest as typeof fetch
  return { state, sendCode: vi.fn<(email: string, data: unknown) => Promise<boolean>>(async () => true) }
})

vi.mock('@/src/services/email', () => ({ sendRequestRecoveryCodeEmail: h.sendCode }))
vi.mock('@/src/services/email/config', () => ({ resendClient: {}, EMAIL_FROM: 'test', EMAIL_FROM_USES_FALLBACK: false }))

const { supabaseRecoveryRepository, requestRefsContainsFilter } = await import('../repository')
const { handleRecoveryRequest } = await import('../handle-request')

let errors: string[]

beforeEach(() => {
  h.state.requests = []
  h.state.rows = {}
  h.state.failHead = false
  h.sendCode.mockClear()
  vi.stubEnv('REQUEST_RECOVERY_SECRET', 's'.repeat(40))
  vi.stubEnv('RESEND_API_KEY', 're_test')
  errors = []
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(' ')))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('challenge rate-limit count (jsonb request_refs)', () => {
  it('sends the containment filter as JSON, never a Postgres array literal', async () => {
    await supabaseRecoveryRepository.countChallengesSince({ kind: 'parts', id: 'req-1' }, '2026-09-27T00:00:00Z')
    const head = h.state.requests.find((r) => r.method === 'HEAD')!
    expect(head.table).toBe('request_recovery_challenges')
    expect(head.params.get('request_refs')).toBe('cs.[{"kind":"parts","id":"req-1"}]')
    expect(head.params.get('request_refs')).not.toContain('[object Object]')
  })

  it('the filter helper produces exactly one {kind,id} element', () => {
    expect(JSON.parse(requestRefsContainsFilter({ kind: 'vehicle', id: 'v-9' }))).toEqual([{ kind: 'vehicle', id: 'v-9' }])
  })

  it('a rejected count is thrown as recovery_store_failed and logged with its HTTP status', async () => {
    h.state.failHead = true
    await expect(supabaseRecoveryRepository.countChallengesSince({ kind: 'parts', id: 'r' }, '2026-01-01T00:00:00Z')).rejects.toThrow('recovery_store_failed')
    expect(errors.join('\n')).toContain('challenge count failed')
    expect(errors.join('\n')).toContain('status=400')
  })
})

describe('real-match lookup through the real client', () => {
  it('a matching request → code_sent (was "unavailable" in production)', async () => {
    h.state.rows.parts_requests = [
      { id: 'p-1', created_at: new Date().toISOString(), customer_name: 'Sophie Diallo', customer_email: 'sophie@example.com', customer_phone: null, whatsapp_phone: null },
    ]
    const response = await handleRecoveryRequest(
      new Request('http://localhost/api/chat/recovery', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.1.0.1' },
        body: JSON.stringify({ action: 'lookup', contact: 'sophie@example.com', lastName: 'Diallo', locale: 'fr' }),
      }),
    )
    const body = await response.json()
    expect(errors).toEqual([])
    expect(response.status).toBe(200)
    expect(body.status).toBe('code_sent')
    expect(h.sendCode).toHaveBeenCalledTimes(1)
    const insert = h.state.requests.find((r) => r.method === 'POST' && r.table === 'request_recovery_challenges')
    expect(insert).toBeDefined()
  })
})

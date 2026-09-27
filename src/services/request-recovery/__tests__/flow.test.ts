import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseDiscriminator, lookupRequest, matchesPeriod, MAX_REQUESTS_PER_CHALLENGE, resendCode, sharedEmail, verifyCode, type RecoveryDeps } from '../flow'
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_MAX_SENDS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from '../otp'
import type { RecoveredRequestRecord, RecoveryCandidate, RecoveryChallenge, RecoveryRepository } from '../types'

const SECRET = 'test-recovery-secret-0123456789abcdef'
const NOW = new Date('2026-09-27T12:00:00Z')
const DAY = 24 * 60 * 60_000

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY).toISOString()
}

function candidate(overrides: Partial<RecoveryCandidate> = {}): RecoveryCandidate {
  return {
    kind: 'parts',
    requestId: 'req-1',
    createdAt: daysAgo(14),
    customerName: 'Sophie Diallo',
    email: 'Sophie.Diallo@gmail.com',
    phones: ['+221 77 123 45 67'],
    ...overrides,
  }
}

const RECORD: RecoveredRequestRecord = {
  kind: 'parts',
  requestNumber: 'DA-2026-000183',
  status: 'on_treatment',
  trackingToken: '3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c',
  vehicleLabel: 'Toyota RAV4 2020',
  createdAt: daysAgo(14),
}

function recordFor(c: RecoveryCandidate): RecoveredRequestRecord {
  return { ...RECORD, kind: c.kind, requestNumber: `DA-${c.requestId}`, createdAt: c.createdAt, trackingToken: `token-${c.requestId}` }
}

// In-memory stand-in for the Supabase repository, with the same
// compare-and-set semantics as the real updateChallenge.
function fakeRepo(candidates: RecoveryCandidate[]) {
  const challenges = new Map<string, RecoveryChallenge>()
  const created: { refs: { kind: string; id: string }[]; at: string }[] = []
  const repo: RecoveryRepository = {
    findCandidates: vi.fn(async () => candidates),
    countChallengesSince: vi.fn(async (ref, since) => created.filter((c) => c.at >= since && c.refs.some((r) => r.kind === ref.kind && r.id === ref.id)).length),
    createChallenge: vi.fn(async (challenge) => {
      challenges.set(challenge.id, { ...challenge })
      created.push({ refs: challenge.requests, at: challenge.lastSentAt })
    }),
    getChallenge: vi.fn(async (id) => (challenges.has(id) ? { ...challenges.get(id)! } : null)),
    updateChallenge: vi.fn(async (id, expectedAttempts, patch) => {
      const current = challenges.get(id)
      if (!current || current.attempts !== expectedAttempts || current.consumedAt) return false
      challenges.set(id, { ...current, ...patch })
      return true
    }),
    getRequestEmail: vi.fn(async (_kind, requestId) => candidates.find((c) => c.requestId === requestId)?.email ?? null),
    getRecoveredRequest: vi.fn(async (_kind, requestId) => {
      if (candidates.length <= 1) return RECORD
      const c = candidates.find((x) => x.requestId === requestId)
      return c ? recordFor(c) : null
    }),
  }
  return { repo, challenges }
}

const CHALLENGE_ID = '11111111-2222-4333-8444-555555555555'
let sentCodes: { email: string; code: string }[]

function deps(repo: RecoveryRepository, overrides: Partial<RecoveryDeps> = {}): RecoveryDeps {
  return {
    repo,
    secret: SECRET,
    now: () => NOW,
    generateId: () => CHALLENGE_ID,
    generateCode: () => '123456',
    sendCode: vi.fn(async (email: string, code: string) => {
      sentCodes.push({ email, code })
      return true
    }),
    ...overrides,
  }
}

beforeEach(() => {
  sentCodes = []
})

describe('lookupRequest — inputs', () => {
  it('does not touch the database without both a contact and a last name', async () => {
    const { repo } = fakeRepo([candidate()])
    expect(await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: '' }, deps(repo))).toEqual({ status: 'invalid_input' })
    expect(await lookupRequest({ contact: '', lastName: 'Diallo' }, deps(repo))).toEqual({ status: 'invalid_input' })
    expect(await lookupRequest({ contact: 'not-a-contact', lastName: 'Diallo' }, deps(repo))).toEqual({ status: 'invalid_input' })
    expect(repo.findCandidates).not.toHaveBeenCalled()
  })

  it('matches email case-insensitively and phone by canonical digits', async () => {
    const { repo } = fakeRepo([candidate()])
    expect((await lookupRequest({ contact: ' SOPHIE.diallo@gmail.com ', lastName: 'diallo' }, deps(repo))).status).toBe('code_sent')
    const { repo: repo2 } = fakeRepo([candidate()])
    expect((await lookupRequest({ contact: '77 123 45 67', lastName: 'DIALLO' }, deps(repo2))).status).toBe('code_sent')
  })
})

describe('lookupRequest — no enumeration', () => {
  const NOT_FOUND = { status: 'not_found' }

  it('answers "not found" identically for an unknown contact, a wrong name and a request without email', async () => {
    const unknown = await lookupRequest({ contact: 'nobody@gmail.com', lastName: 'Diallo' }, deps(fakeRepo([]).repo))
    const wrongName = await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Ndiaye' }, deps(fakeRepo([candidate()]).repo))
    const noEmail = await lookupRequest({ contact: '771234567', lastName: 'Diallo' }, deps(fakeRepo([candidate({ email: null })]).repo))
    expect(unknown).toEqual(NOT_FOUND)
    expect(wrongName).toEqual(NOT_FOUND)
    expect(noEmail).toEqual(NOT_FOUND)
    expect(JSON.stringify([unknown, wrongName, noEmail])).not.toMatch(/exist|email|phone|count/i)
    expect(sentCodes).toHaveLength(0)
  })

  it('never returns request data, the full email or a match count before verification', async () => {
    const result = await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(fakeRepo([candidate()]).repo))
    expect(result).toEqual({ status: 'code_sent', challengeId: CHALLENGE_ID, destination: 's•••••@gmail.com', resendAfterSeconds: 60 })
    const serialized = JSON.stringify(result)
    for (const secret of ['DA-2026', 'Toyota', 'on_treatment', RECORD.trackingToken, 'sophie.diallo', 'Diallo', '771234567', '123456']) {
      expect(serialized).not.toContain(secret)
    }
  })
})

describe('lookupRequest — unique and multiple candidates', () => {
  it('a unique match still requires verification: it only sends a code', async () => {
    const { repo, challenges } = fakeRepo([candidate()])
    const result = await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(repo))
    expect(result.status).toBe('code_sent')
    expect(sentCodes).toEqual([{ email: 'Sophie.Diallo@gmail.com', code: '123456' }])
    expect(repo.getRecoveredRequest).not.toHaveBeenCalled()
    expect(challenges.get(CHALLENGE_ID)?.consumedAt).toBeNull()
  })

  it('asks for the request type when the matches are of different types', async () => {
    const both = [candidate(), candidate({ kind: 'vehicle', requestId: 'req-2' })]
    const result = await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(fakeRepo(both).repo))
    expect(result).toEqual({ status: 'need_discriminator', discriminator: 'kind' })
    expect(sentCodes).toHaveLength(0)
  })

  it('asks for the approximate period when the matches share a type — one question only', async () => {
    const two = [candidate({ createdAt: daysAgo(3) }), candidate({ requestId: 'req-2', createdAt: daysAgo(120) })]
    const { repo } = fakeRepo(two)
    expect(await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(repo))).toEqual({
      status: 'need_discriminator',
      discriminator: 'period',
    })
    const answered = await lookupRequest(
      { contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: { type: 'period', value: 'older' } },
      deps(repo),
    )
    expect(answered.status).toBe('code_sent')
    expect(repo.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ requests: [{ kind: 'parts', id: 'req-2' }] }))
  })


  it('the approximate date is never authentication on its own', async () => {
    // Right period, wrong contact/name → nothing.
    const { repo } = fakeRepo([candidate({ createdAt: daysAgo(3) })])
    const result = await lookupRequest(
      { contact: 'someone.else@gmail.com', lastName: 'Diallo', discriminator: { type: 'period', value: 'week' } },
      deps(repo),
    )
    expect(result).toEqual({ status: 'not_found' })
    expect(sentCodes).toHaveLength(0)
    // And even with a matching period the flow still stops at a code.
    const matched = await lookupRequest(
      { contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: { type: 'period', value: 'week' } },
      deps(repo),
    )
    expect(matched.status).toBe('code_sent')
  })

  it('a discriminator matching nothing answers "not found"', async () => {
    const two = [candidate({ createdAt: daysAgo(2) }), candidate({ requestId: 'req-2', createdAt: daysAgo(3) })]
    const result = await lookupRequest(
      { contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: { type: 'period', value: 'older' } },
      deps(fakeRepo(two).repo),
    )
    expect(result).toEqual({ status: 'not_found' })
  })

  it('chooses the discriminator and period windows deterministically', () => {
    expect(chooseDiscriminator([candidate(), candidate()])).toBe('period')
    expect(chooseDiscriminator([candidate(), candidate({ kind: 'vehicle' })])).toBe('kind')
    expect(matchesPeriod(daysAgo(14), 'month', NOW)).toBe(true)
    expect(matchesPeriod(daysAgo(14), 'week', NOW)).toBe(false)
  })

  it('limits verification emails per request per hour', async () => {
    const { repo } = fakeRepo([candidate()])
    let n = 0
    const d = deps(repo, { generateId: () => `11111111-2222-4333-8444-55555555555${n++}` })
    for (let i = 0; i < 3; i += 1) expect((await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, d)).status).toBe('code_sent')
    expect(await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, d)).toEqual({ status: 'rate_limited' })
    expect(sentCodes).toHaveLength(3)
  })

  it('invalidates the challenge when the email could not be sent', async () => {
    const { repo, challenges } = fakeRepo([candidate()])
    const result = await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(repo, { sendCode: async () => false }))
    expect(result).toEqual({ status: 'delivery_failed' })
    expect(challenges.get(CHALLENGE_ID)?.consumedAt).not.toBeNull()
  })
})

describe('several requests still match after the discriminator', () => {
  // Both fall in the "1 to 4 weeks" window, so the one question can't split them.
  const twoSameEmail = () => [
    candidate({ requestId: 'req-1', createdAt: daysAgo(12) }),
    candidate({ requestId: 'req-2', createdAt: daysAgo(30), email: ' sophie.diallo@GMAIL.com' }),
  ]
  const month = { type: 'period', value: 'month' } as const

  it('never picks the most recent: one code covers every match sharing the email', async () => {
    const { repo, challenges } = fakeRepo(twoSameEmail())
    const result = await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: month }, deps(repo))
    // Same response shape as a single match — no count, no request data.
    expect(result).toEqual({ status: 'code_sent', challengeId: CHALLENGE_ID, destination: 's•••••@gmail.com', resendAfterSeconds: 60 })
    expect(challenges.get(CHALLENGE_ID)?.requests).toEqual([
      { kind: 'parts', id: 'req-1' },
      { kind: 'parts', id: 'req-2' },
    ])
    expect(sentCodes).toEqual([{ email: 'Sophie.Diallo@gmail.com', code: '123456' }])
    expect(repo.getRecoveredRequest).not.toHaveBeenCalled()
  })

  it('reveals the list only after the correct code, for the customer to choose', async () => {
    const { repo } = fakeRepo(twoSameEmail())
    await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: month }, deps(repo))
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '000000' }, deps(repo))).toEqual({ status: 'invalid_code', attemptsLeft: OTP_MAX_ATTEMPTS - 1 })
    expect(repo.getRecoveredRequest).not.toHaveBeenCalled()

    const verified = await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, deps(repo))
    expect(verified.status).toBe('verified_multiple')
    if (verified.status !== 'verified_multiple') return
    expect(verified.requests.map((r) => r.requestNumber)).toEqual(['DA-req-1', 'DA-req-2'])
    // Same OTP rules as a single request: single use.
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, deps(repo))).toEqual({ status: 'expired' })
  })

  it('by phone with different emails: no code, no guess — ask to contact Dakar Auto', async () => {
    const differentEmails = [
      candidate({ requestId: 'req-1', createdAt: daysAgo(12) }),
      candidate({ requestId: 'req-2', createdAt: daysAgo(20), email: 'other.address@gmail.com' }),
    ]
    const { repo } = fakeRepo(differentEmails)
    const result = await lookupRequest({ contact: '+221 77 123 45 67', lastName: 'Diallo', discriminator: month }, deps(repo))
    expect(result).toEqual({ status: 'needs_assistance' })
    expect(sentCodes).toHaveLength(0)
    expect(repo.createChallenge).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toMatch(/DA-|req-|gmail|•/)
  })

  it('treats a match without an email as unverifiable — never drops it to pick the other', async () => {
    const oneWithoutEmail = [candidate({ requestId: 'req-1', createdAt: daysAgo(12) }), candidate({ requestId: 'req-2', createdAt: daysAgo(20), email: null })]
    const { repo } = fakeRepo(oneWithoutEmail)
    expect(await lookupRequest({ contact: '771234567', lastName: 'Diallo', discriminator: month }, deps(repo))).toEqual({ status: 'needs_assistance' })
    expect(sentCodes).toHaveLength(0)
  })

  it('asks the one discriminator first — ambiguity is only reported after it', async () => {
    const { repo } = fakeRepo(twoSameEmail())
    expect(await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(repo))).toEqual({
      status: 'need_discriminator',
      discriminator: 'period',
    })
    expect(repo.createChallenge).not.toHaveBeenCalled()
  })

  it(`sends no code for more than ${MAX_REQUESTS_PER_CHALLENGE} matches`, async () => {
    const many = Array.from({ length: MAX_REQUESTS_PER_CHALLENGE + 1 }, (_, i) => candidate({ requestId: `req-${i}`, createdAt: daysAgo(12) }))
    expect(await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: month }, deps(fakeRepo(many).repo))).toEqual({
      status: 'needs_assistance',
    })
    expect(sentCodes).toHaveLength(0)
  })

  it('applies the per-request hourly limit to every covered request', async () => {
    const { repo } = fakeRepo(twoSameEmail())
    let n = 0
    const d = deps(repo, { generateId: () => `11111111-2222-4333-8444-55555555555${n++}` })
    // Three single-request challenges for req-2 alone…
    const req2Only = { contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: { type: 'period', value: 'quarter' } } as const
    for (let i = 0; i < 3; i += 1) expect((await lookupRequest(req2Only, d)).status).toBe('code_sent')
    // …block a challenge that would also cover req-2.
    expect(await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: month }, d)).toEqual({ status: 'rate_limited' })
  })

  it('resends only while every covered request still shares the email', async () => {
    const candidates = twoSameEmail()
    const { repo } = fakeRepo(candidates)
    await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo', discriminator: month }, deps(repo))
    const later = deps(repo, { now: () => new Date(NOW.getTime() + OTP_RESEND_COOLDOWN_MS) })
    expect(await resendCode({ challengeId: CHALLENGE_ID }, later)).toMatchObject({ status: 'code_sent', destination: 's•••••@gmail.com' })
    candidates[1].email = 'changed@gmail.com'
    const evenLater = deps(repo, { now: () => new Date(NOW.getTime() + 2 * OTP_RESEND_COOLDOWN_MS) })
    expect(await resendCode({ challengeId: CHALLENGE_ID }, evenLater)).toEqual({ status: 'expired' })
  })

  it('sharedEmail compares normalized addresses and rejects missing ones', () => {
    expect(sharedEmail([candidate(), candidate({ email: 'SOPHIE.DIALLO@gmail.com ' })])).toBe('Sophie.Diallo@gmail.com')
    expect(sharedEmail([candidate(), candidate({ email: 'x@gmail.com' })])).toBeNull()
    expect(sharedEmail([candidate({ email: null }), candidate({ email: null })])).toBeNull()
  })
})

describe('OTP generation and storage', () => {
  it('generates 6-digit codes with a CSPRNG', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOtp()))
    for (const code of codes) expect(code).toMatch(/^\d{6}$/)
    expect(codes.size).toBeGreaterThan(190)
  })

  it('stores only a keyed hash bound to the challenge, never the code', async () => {
    const { repo, challenges } = fakeRepo([candidate()])
    await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(repo))
    const stored = challenges.get(CHALLENGE_ID)!
    expect(JSON.stringify(stored)).not.toContain('123456')
    expect(stored.codeHash).toBe(hashOtp(SECRET, CHALLENGE_ID, '123456'))
    expect(stored.codeHash).not.toBe(hashOtp(SECRET, '99999999-2222-4333-8444-555555555555', '123456'))
    expect(stored.codeHash).not.toBe(hashOtp('another-secret-0123456789abcdefghij', CHALLENGE_ID, '123456'))
    expect(new Date(stored.expiresAt).getTime() - NOW.getTime()).toBe(OTP_TTL_MS)
  })
})

async function withChallenge() {
  const fake = fakeRepo([candidate()])
  await lookupRequest({ contact: 'sophie.diallo@gmail.com', lastName: 'Diallo' }, deps(fake.repo))
  return fake
}

describe('verifyCode', () => {
  it('reveals the request only after the correct code', async () => {
    const { repo } = await withChallenge()
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, deps(repo))).toEqual({ status: 'verified', request: RECORD })
  })

  it('is single-use', async () => {
    const { repo } = await withChallenge()
    expect((await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, deps(repo))).status).toBe('verified')
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, deps(repo))).toEqual({ status: 'expired' })
  })

  it('expires after the TTL', async () => {
    const { repo } = await withChallenge()
    const later = deps(repo, { now: () => new Date(NOW.getTime() + OTP_TTL_MS + 1000) })
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, later)).toEqual({ status: 'expired' })
    expect(repo.getRecoveredRequest).not.toHaveBeenCalled()
  })

  it('counts wrong attempts and locks the challenge at the limit', async () => {
    const { repo } = await withChallenge()
    for (let i = 1; i < OTP_MAX_ATTEMPTS; i += 1) {
      expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '000000' }, deps(repo))).toEqual({ status: 'invalid_code', attemptsLeft: OTP_MAX_ATTEMPTS - i })
    }
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '000000' }, deps(repo))).toEqual({ status: 'locked' })
    // Even the right code is refused once locked.
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, deps(repo))).toEqual({ status: 'locked' })
    expect(repo.getRecoveredRequest).not.toHaveBeenCalled()
  })

  it('malformed codes and unknown challenges reveal nothing', async () => {
    const { repo } = await withChallenge()
    expect(await verifyCode({ challengeId: CHALLENGE_ID, code: 'abc' }, deps(repo))).toEqual({ status: 'invalid_code', attemptsLeft: OTP_MAX_ATTEMPTS - 1 })
    expect(await verifyCode({ challengeId: 'not-a-uuid', code: '123456' }, deps(repo))).toEqual({ status: 'expired' })
    expect(await verifyCode({ challengeId: '99999999-2222-4333-8444-555555555555', code: '123456' }, deps(repo))).toEqual({ status: 'expired' })
  })
})

describe('resendCode', () => {
  it('enforces the cooldown', async () => {
    const { repo } = await withChallenge()
    const soon = deps(repo, { now: () => new Date(NOW.getTime() + 10_000) })
    expect(await resendCode({ challengeId: CHALLENGE_ID }, soon)).toEqual({ status: 'cooldown', retryAfterSeconds: 50 })
  })

  it('replaces the code after the cooldown; the old code stops working and attempts carry over', async () => {
    const { repo, challenges } = await withChallenge()
    await verifyCode({ challengeId: CHALLENGE_ID, code: '000000' }, deps(repo))
    const later = deps(repo, { now: () => new Date(NOW.getTime() + OTP_RESEND_COOLDOWN_MS), generateCode: () => '654321' })
    expect(await resendCode({ challengeId: CHALLENGE_ID }, later)).toMatchObject({ status: 'code_sent', destination: 's•••••@gmail.com' })
    expect(challenges.get(CHALLENGE_ID)?.attempts).toBe(1)
    expect((await verifyCode({ challengeId: CHALLENGE_ID, code: '123456' }, later)).status).toBe('invalid_code')
    expect((await verifyCode({ challengeId: CHALLENGE_ID, code: '654321' }, later)).status).toBe('verified')
  })

  it(`stops after ${OTP_MAX_SENDS} emails`, async () => {
    const { repo } = await withChallenge()
    let t = NOW.getTime()
    const step = () => deps(repo, { now: () => new Date((t += OTP_RESEND_COOLDOWN_MS)) })
    for (let i = 1; i < OTP_MAX_SENDS; i += 1) expect((await resendCode({ challengeId: CHALLENGE_ID }, step())).status).toBe('code_sent')
    expect(await resendCode({ challengeId: CHALLENGE_ID }, step())).toEqual({ status: 'rate_limited' })
  })
})

describe('privacy boundary', () => {
  // Every module of the recovery flow, and the recovery API route.
  const files = [
    ...readdirSync(path.resolve(__dirname, '..'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => path.resolve(__dirname, '..', f)),
    path.resolve(__dirname, '../../../../app/api/chat/recovery/route.ts'),
  ]

  it('never imports the AI provider or the chat assistant', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from ['"]openai['"]/)
      expect(source, file).not.toMatch(/services\/chat\//)
    }
  })
})

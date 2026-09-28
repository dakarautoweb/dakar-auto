import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import type { RecoveryContact } from '@/src/lib/request-recovery/normalize'
import type { RecoveryRequestKind } from '@/src/lib/request-recovery/types'
import type { RecoveredRequestRecord, RecoveryCandidate, RecoveryChallenge, RecoveryRepository, RecoveryRequestRef } from './types'

// Service-role access, same trust model as the public tracking lookups
// (src/services/tracking/lookup-tracking-token.ts): there is no customer
// session, so the safety boundary is this module — only the columns below
// are ever read, and only flow.ts decides what leaves the server.

const CHALLENGES = 'request_recovery_challenges'
const MAX_CANDIDATES_PER_TABLE = 50
// Stored phones are free-form ("+221 77 123 45 67"), so the pre-filter
// allows any separator between the last digits; flow.ts then compares the
// normalized numbers exactly.
const PHONE_SUFFIX_DIGITS = 9

type Row = Record<string, unknown>

// One adapter per table: each lists the columns it reads and normalizes its
// own row shape, so a schema change in one request table can't silently
// break (or be masked by) the other. Both schemas were verified against the
// production database on 2026-09-27 and currently use the same contact
// columns.
export type CandidateSource = {
  table: string
  columns: string
  emailColumn: string
  phoneColumns: string[]
  toCandidate: (row: Row) => RecoveryCandidate
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export const CANDIDATE_SOURCES: Record<RecoveryRequestKind, CandidateSource> = {
  parts: {
    table: 'parts_requests',
    columns: 'id, created_at, customer_name, customer_email, customer_phone, whatsapp_phone',
    emailColumn: 'customer_email',
    phoneColumns: ['customer_phone', 'whatsapp_phone'],
    toCandidate: (row) => ({
      kind: 'parts',
      requestId: String(row.id),
      createdAt: String(row.created_at),
      customerName: text(row.customer_name),
      email: text(row.customer_email),
      phones: [text(row.customer_phone), text(row.whatsapp_phone)].filter((p): p is string => p !== null),
    }),
  },
  vehicle: {
    table: 'vehicle_requests',
    columns: 'id, created_at, customer_name, customer_email, customer_phone, whatsapp_phone',
    emailColumn: 'customer_email',
    phoneColumns: ['customer_phone', 'whatsapp_phone'],
    toCandidate: (row) => ({
      kind: 'vehicle',
      requestId: String(row.id),
      createdAt: String(row.created_at),
      customerName: text(row.customer_name),
      email: text(row.customer_email),
      phones: [text(row.customer_phone), text(row.whatsapp_phone)].filter((p): p is string => p !== null),
    }),
  },
}

type ChallengeRow = {
  id: string
  request_kind: RecoveryRequestKind
  request_id: string
  code_hash: string
  attempts: number
  send_count: number
  last_sent_at: string
  expires_at: string
  consumed_at: string | null
  request_refs: RecoveryRequestRef[] | null
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

function logError(context: string, error: { message: string; code?: string } | null, status?: number) {
  // Error text only — never the contact, name or code being looked up. The
  // HTTP status matters for count (HEAD) queries, whose errors have no body.
  if (error) console.error(`[request-recovery] ${context}:`, `status=${status ?? 'n/a'}`, error.code ?? '', error.message)
}

// request_refs is jsonb. supabase-js serializes an *array* passed to
// .contains() as a Postgres array literal (`cs.{[object Object]}`), which
// PostgREST rejects with HTTP 400 — so the filter must be sent as JSON text
// (`cs.[{"kind":…,"id":…}]`). Passing the array broke every lookup that
// found a real match (production, found 2026-09-27).
export function requestRefsContainsFilter(ref: RecoveryRequestRef): string {
  return JSON.stringify([{ kind: ref.kind, id: ref.id }])
}

async function findInTable(kind: RecoveryRequestKind, contact: RecoveryContact): Promise<RecoveryCandidate[]> {
  const source = CANDIDATE_SOURCES[kind]
  let query = supabaseAdmin.from(source.table).select(source.columns)
  if (contact.kind === 'email') {
    query = query.ilike(source.emailColumn, escapeLike(contact.email))
  } else {
    const pattern = `%${contact.digits.slice(-PHONE_SUFFIX_DIGITS).split('').join('%')}%`
    query = query.or(source.phoneColumns.map((column) => `${column}.ilike.${pattern}`).join(','))
  }
  const { data, error, status } = await query.order('created_at', { ascending: false }).limit(MAX_CANDIDATES_PER_TABLE)
  if (error) {
    logError(`candidate lookup (${kind}) failed`, error, status)
    throw new Error('recovery_lookup_failed')
  }
  return ((data ?? []) as unknown as Row[]).map(source.toCandidate)
}

function mapChallenge(row: ChallengeRow): RecoveryChallenge {
  return {
    id: row.id,
    requests: row.request_refs?.length ? row.request_refs : [{ kind: row.request_kind, id: row.request_id }],
    codeHash: row.code_hash,
    attempts: row.attempts,
    sendCount: row.send_count,
    lastSentAt: row.last_sent_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
  }
}

const PATCH_COLUMNS: Record<string, string> = {
  attempts: 'attempts',
  codeHash: 'code_hash',
  sendCount: 'send_count',
  lastSentAt: 'last_sent_at',
  expiresAt: 'expires_at',
  consumedAt: 'consumed_at',
}

export const supabaseRecoveryRepository: RecoveryRepository = {
  async findCandidates(contact) {
    const [parts, vehicle] = await Promise.all([findInTable('parts', contact), findInTable('vehicle', contact)])
    return [...parts, ...vehicle]
  },

  async countChallengesSince(ref, sinceIso) {
    const { count, error, status } = await supabaseAdmin
      .from(CHALLENGES)
      .select('id', { count: 'exact', head: true })
      .contains('request_refs', requestRefsContainsFilter(ref))
      .gte('created_at', sinceIso)
    if (error) {
      logError('challenge count failed', error, status)
      throw new Error('recovery_store_failed')
    }
    return count ?? 0
  },

  async createChallenge(challenge) {
    const { error } = await supabaseAdmin.from(CHALLENGES).insert({
      id: challenge.id,
      request_kind: challenge.requests[0].kind,
      request_id: challenge.requests[0].id,
      request_refs: challenge.requests,
      code_hash: challenge.codeHash,
      attempts: challenge.attempts,
      send_count: challenge.sendCount,
      last_sent_at: challenge.lastSentAt,
      expires_at: challenge.expiresAt,
      consumed_at: challenge.consumedAt,
    })
    if (error) {
      logError('challenge insert failed', error)
      throw new Error('recovery_store_failed')
    }
  },

  async getChallenge(id) {
    const { data, error } = await supabaseAdmin
      .from(CHALLENGES)
      .select('id, request_kind, request_id, request_refs, code_hash, attempts, send_count, last_sent_at, expires_at, consumed_at')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      logError('challenge read failed', error)
      throw new Error('recovery_store_failed')
    }
    return data ? mapChallenge(data as ChallengeRow) : null
  },

  async updateChallenge(id, expectedAttempts, patch) {
    const row = Object.fromEntries(Object.entries(patch).map(([key, value]) => [PATCH_COLUMNS[key], value]))
    const { data, error } = await supabaseAdmin
      .from(CHALLENGES)
      .update(row)
      .eq('id', id)
      .eq('attempts', expectedAttempts)
      .is('consumed_at', null)
      .select('id')
    if (error) {
      logError('challenge update failed', error)
      throw new Error('recovery_store_failed')
    }
    return (data ?? []).length > 0
  },

  async getRequestEmail(kind, requestId) {
    const source = CANDIDATE_SOURCES[kind]
    const { data, error } = await supabaseAdmin.from(source.table).select(source.emailColumn).eq('id', requestId).maybeSingle()
    if (error) {
      logError('request email read failed', error)
      throw new Error('recovery_lookup_failed')
    }
    return text((data as Row | null)?.[source.emailColumn])
  },

  async getRecoveredRequest(kind, requestId): Promise<RecoveredRequestRecord | null> {
    if (kind === 'parts') {
      const { data, error } = await supabaseAdmin
        .from('parts_requests')
        .select('request_number, status, tracking_token, created_at, vehicles(year, make, model)')
        .eq('id', requestId)
        .maybeSingle()
      if (error) {
      // A read failure is "unavailable", never a silent "expired".
      logError('parts request read failed', error)
      throw new Error('recovery_lookup_failed')
    }
      if (!data) return null
      const vehicle = (Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles) as { year: number | null; make: string; model: string } | null
      return {
        kind,
        requestNumber: data.request_number as string,
        status: data.status as string,
        trackingToken: data.tracking_token as string,
        createdAt: data.created_at as string,
        vehicleLabel: vehicle ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || null : null,
      }
    }

    const { data, error } = await supabaseAdmin
      .from('vehicle_requests')
      .select('request_number, status, tracking_token, created_at, make, model, year_from, year_to')
      .eq('id', requestId)
      .maybeSingle()
    if (error) {
      // A read failure is "unavailable", never a silent "expired".
      logError('vehicle request read failed', error)
      throw new Error('recovery_lookup_failed')
    }
    if (!data) return null
    const years = [data.year_from, data.year_to].filter(Boolean)
    const yearLabel = years.length === 2 && years[0] !== years[1] ? `${years[0]}–${years[1]}` : years[0] ? String(years[0]) : null
    return {
      kind,
      requestNumber: data.request_number as string,
      status: data.status as string,
      trackingToken: data.tracking_token as string,
      createdAt: data.created_at as string,
      vehicleLabel: [data.make, data.model, yearLabel].filter(Boolean).join(' ') || null,
    }
  },
}

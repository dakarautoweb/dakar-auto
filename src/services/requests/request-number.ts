import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Request numbers are always assigned server-side — the browser must never
// be trusted to generate or supply one.
//
// Generation itself is delegated to public.next_request_number(), a
// SECURITY DEFINER Postgres function backed by a row-locked counter table
// (see the migration in the project notes). That makes it atomic under
// concurrency and immune to number reuse after a row is deleted — unlike
// the previous "look at MAX(request_number) among existing rows" approach,
// which could hand out an already-used number once the row that used it
// was gone.
//
// The public format is DA-YYYY-NNNNNN (e.g. DA-2026-000123), and this
// module is its single source of truth: the formatted value is written
// as-is to parts_requests.request_number, and every consumer (success
// screen, admin, tracking, emails) displays that stored string verbatim —
// nothing downstream adds the year or re-pads the sequence.
export const REQUEST_NUMBER_PREFIX = 'DA'

const SEQUENCE_DIGITS = 6

export class MalformedRequestNumberError extends Error {
  constructor(raw: unknown) {
    super(`next_request_number returned an unexpected value: ${JSON.stringify(raw)}`)
    this.name = 'MalformedRequestNumberError'
  }
}

// The RPC's SQL lives outside the tracked migrations, so its exact output
// isn't guaranteed by this repo. Accepted: `<prefix>-[YYYY-]<digits>` with
// the exact uppercase prefix. A year already present is preserved; a
// missing one is filled in with the current UTC year (no project-wide
// business timezone exists). The sequence is zero-padded to 6 digits, and
// longer sequences are kept as-is; an all-zero sequence is rejected.
// Anything else — wrong/lowercase prefix, non-digit sequence, stray
// whitespace — throws rather than guessing, so a contract change surfaces
// as a failed submission instead of a silently invented number.
export function normalizeRequestNumber(raw: unknown, now: Date = new Date(), prefix: string = REQUEST_NUMBER_PREFIX): string {
  if (typeof raw !== 'string') throw new MalformedRequestNumberError(raw)

  const match = new RegExp(`^${prefix}-(?:(\\d{4})-)?(\\d+)$`).exec(raw)
  if (!match) throw new MalformedRequestNumberError(raw)

  const [, year = String(now.getUTCFullYear()), sequence] = match
  // All-zero sequences (DA-0, DA-2026-000000) are never issued by the
  // counter — a valid sequence is numerically > 0. Checked on the digit
  // string, so arbitrarily long sequences can't lose precision.
  if (/^0+$/.test(sequence)) throw new MalformedRequestNumberError(raw)
  return `${prefix}-${year}-${sequence.padStart(SEQUENCE_DIGITS, '0')}`
}

export async function generateRequestNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('next_request_number', { p_prefix: REQUEST_NUMBER_PREFIX })
  if (error) throw error
  return normalizeRequestNumber(data)
}

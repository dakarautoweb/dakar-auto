import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Public, unauthenticated request lookup by request_number + email/phone —
// the "I lost my tracking link" path. request_number is sequential and
// guessable (see request-number.ts), so this never trusts it alone: the
// caller must also supply the email OR phone on file for that request, and
// only tracking_token is ever returned — nothing else about the row, and no
// distinction between "no such request_number" and "found but the contact
// didn't match" (both return null), so this can't be used to probe which
// request numbers exist. Pair with isRateLimited() at the call site to
// blunt scripted brute-forcing of request_number.
function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export async function lookupTrackingToken(rawRequestNumber: string, rawContact: string): Promise<string | null> {
  const requestNumber = rawRequestNumber.trim().toUpperCase()
  const contact = rawContact.trim()
  if (!requestNumber || !contact) return null

  const { data: row, error } = await supabaseAdmin
    .from('parts_requests')
    .select('tracking_token, customer_email, customer_phone')
    .eq('request_number', requestNumber)
    .maybeSingle()

  if (error) {
    console.error('[tracking] lookupTrackingToken failed:', error.message)
    return null
  }
  if (!row) return null

  const isEmailInput = contact.includes('@')
  const matches = isEmailInput
    ? typeof row.customer_email === 'string' && row.customer_email.trim().toLowerCase() === contact.toLowerCase()
    : normalizePhoneDigits(contact).length >= 6 &&
      typeof row.customer_phone === 'string' &&
      normalizePhoneDigits(row.customer_phone) === normalizePhoneDigits(contact)

  if (!matches) return null
  return row.tracking_token as string
}

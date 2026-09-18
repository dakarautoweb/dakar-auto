import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Public, unauthenticated vehicle-request lookup by request_number +
// email/phone — the VR- counterpart to lookup-tracking-token.ts (parts
// requests). Kept as a parallel file rather than a parameterized shared
// function, matching how this codebase already keeps parts/vehicle service
// logic separate (see admin/statuses.ts vs admin/vehicle-request-statuses.ts).
// Same security properties as the parts version: request_number alone is
// never enough (it's sequential/guessable, see request-number.ts), "no such
// request_number" and "found but contact doesn't match" both return null,
// and only tracking_token is ever returned — nothing else about the row.
function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export async function lookupVehicleTrackingToken(rawRequestNumber: string, rawContact: string): Promise<string | null> {
  const requestNumber = rawRequestNumber.trim().toUpperCase()
  const contact = rawContact.trim()
  if (!requestNumber || !contact) return null

  const { data: row, error } = await supabaseAdmin
    .from('vehicle_requests')
    .select('tracking_token, customer_email, customer_phone')
    .eq('request_number', requestNumber)
    .maybeSingle()

  if (error) {
    console.error('[tracking] lookupVehicleTrackingToken failed:', error.message)
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

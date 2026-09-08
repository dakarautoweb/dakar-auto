'use server'

import { after } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { sendVehicleRequestStatusUpdateEmail } from '@/src/services/email'
import { requireAdmin } from './auth'
import { isVehicleRequestStatus } from './vehicle-request-statuses'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type UpdateVehicleRequestStatusResult = { ok: true } | { ok: false; error: string }

// There is no vehicle-request-status-history table in the current schema
// (unlike parts_requests, which has request_status_history). We deliberately
// do not fake one — the status itself is updated and is the source of
// truth, but no change note is collected here since there's nowhere to
// persist it.
export async function updateVehicleRequestStatusAction(
  requestId: string,
  newStatus: string
): Promise<UpdateVehicleRequestStatusResult> {
  await requireAdmin()

  if (!UUID_PATTERN.test(requestId)) return { ok: false, error: 'invalid_id' }
  if (!isVehicleRequestStatus(newStatus)) return { ok: false, error: 'invalid_status' }

  const supabase = await createSupabaseServerClient()

  const { data: current, error: currentError } = await supabase
    .from('vehicle_requests')
    .select('request_number, customer_name, customer_email, locale')
    .eq('id', requestId)
    .maybeSingle()

  if (currentError || !current) return { ok: false, error: 'not_found' }

  const { data: updated, error: updateError } = await supabase
    .from('vehicle_requests')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id')
    .maybeSingle()

  // A null row back (with no error) means RLS silently filtered the write —
  // treat that the same as a hard failure rather than reporting success.
  if (updateError || !updated) return { ok: false, error: 'update_failed' }

  const customerEmail = (current.customer_email as string | null) ?? null
  const customerName = current.customer_name as string
  const requestNumber = current.request_number as string
  const locale = (current.locale as string) === 'en' ? 'en' : 'fr'

  after(async () => {
    try {
      await sendVehicleRequestStatusUpdateEmail({ requestNumber, locale, status: newStatus, customerName }, customerEmail)
    } catch (err) {
      console.error(
        '[email] Unexpected error sending vehicle request status update email:',
        err instanceof Error ? err.message : 'Unknown error'
      )
    }
  })

  return { ok: true }
}

export type SaveVehicleRequestNotesResult = { ok: true } | { ok: false; error: string }

export async function saveVehicleRequestNotesAction(requestId: string, notes: string): Promise<SaveVehicleRequestNotesResult> {
  await requireAdmin()

  if (!UUID_PATTERN.test(requestId)) return { ok: false, error: 'invalid_id' }

  const trimmed = notes.slice(0, 5000)
  const supabase = await createSupabaseServerClient()

  const { data: updated, error } = await supabase
    .from('vehicle_requests')
    .update({ admin_notes: trimmed || null, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id')
    .maybeSingle()

  if (error || !updated) return { ok: false, error: 'update_failed' }

  return { ok: true }
}

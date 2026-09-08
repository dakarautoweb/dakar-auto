'use server'

import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { sendStatusUpdateEmail } from '@/src/services/email'
import { requireAdmin } from './auth'
import { isRequestStatus } from './statuses'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LoginState = { error: 'missing_fields' | 'invalid_credentials' | 'not_admin' | null }

export async function loginAdminAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'missing_fields' }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Supabase's own "Invalid login credentials" message already avoids
  // confirming whether the email exists — we pass that same generic error
  // through rather than adding our own more specific one.
  if (error || !data.user) {
    return { error: 'invalid_credentials' }
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    await supabase.auth.signOut()
    return { error: 'not_admin' }
  }

  redirect('/admin')
}

export async function logoutAdminAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export type UpdateStatusResult = { ok: true } | { ok: false; error: string }

export async function updateRequestStatusAction(
  requestId: string,
  newStatus: string,
  note: string
): Promise<UpdateStatusResult> {
  const admin = await requireAdmin()

  if (!UUID_PATTERN.test(requestId)) return { ok: false, error: 'invalid_id' }
  if (!isRequestStatus(newStatus)) return { ok: false, error: 'invalid_status' }

  const trimmedNote = note.trim().slice(0, 2000)
  const supabase = await createSupabaseServerClient()

  const { data: current, error: currentError } = await supabase
    .from('parts_requests')
    .select('status, request_number, customer_name, customer_email, locale')
    .eq('id', requestId)
    .maybeSingle()

  if (currentError || !current) return { ok: false, error: 'not_found' }

  const oldStatus = current.status as string

  const { data: updated, error: updateError } = await supabase
    .from('parts_requests')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id')
    .maybeSingle()

  // A null row back (with no error) means RLS silently filtered the write —
  // treat that the same as a hard failure rather than reporting success.
  if (updateError || !updated) return { ok: false, error: 'update_failed' }

  const { error: historyError } = await supabase.from('request_status_history').insert({
    request_id: requestId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: admin.id,
    note: trimmedNote || null,
  })

  if (historyError) {
    console.error('[admin] Failed to record status history:', historyError.message)
    // The status change itself already succeeded and is the source of
    // truth — a missing history row is logged, not surfaced as a failure.
  }

  const customerEmail = (current.customer_email as string | null) ?? null
  const customerName = current.customer_name as string
  const requestNumber = current.request_number as string
  const locale = (current.locale as string) === 'en' ? 'en' : 'fr'

  after(async () => {
    try {
      await sendStatusUpdateEmail({ requestNumber, locale, status: newStatus, customerName }, customerEmail)
    } catch (err) {
      console.error('[email] Unexpected error sending status update email:', err instanceof Error ? err.message : 'Unknown error')
    }
  })

  return { ok: true }
}

export type SaveNotesResult = { ok: true } | { ok: false; error: string }

export async function saveAdminNotesAction(requestId: string, notes: string): Promise<SaveNotesResult> {
  await requireAdmin()

  if (!UUID_PATTERN.test(requestId)) return { ok: false, error: 'invalid_id' }

  const trimmed = notes.slice(0, 5000)
  const supabase = await createSupabaseServerClient()

  const { data: updated, error } = await supabase
    .from('parts_requests')
    .update({ admin_notes: trimmed || null, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id')
    .maybeSingle()

  if (error || !updated) return { ok: false, error: 'update_failed' }

  return { ok: true }
}

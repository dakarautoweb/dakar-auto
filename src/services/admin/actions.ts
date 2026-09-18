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

// --- Account settings (Paramètres page) -----------------------------------
//
// All four actions operate on the currently-signed-in admin's own real
// Supabase Auth session (via createSupabaseServerClient, RLS-respecting —
// never the service-role key) — real backend calls, not placeholders.
// Name is the one field stored outside auth.users, in the existing
// public.admins.full_name column (already read by requireAdmin()); email
// and password go through Supabase Auth's own updateUser()/
// resetPasswordForEmail(), which is real, existing Supabase functionality,
// not anything invented for this page.

// Note: this file has a module-level 'use server' directive, so every
// runtime export must be an async function — the shared initial state
// literal therefore lives in each client form component instead of being
// exported from here (only the type is imported there).
export type SettingsActionState = { status: 'idle' } | { status: 'success'; message?: string } | { status: 'error'; error: string }

export async function updateAdminNameAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const admin = await requireAdmin()
  const fullName = String(formData.get('fullName') ?? '').trim()

  if (!fullName) return { status: 'error', error: 'missing_name' }
  if (fullName.length > 200) return { status: 'error', error: 'name_too_long' }

  const supabase = await createSupabaseServerClient()
  // `.select().maybeSingle()` surfaces an RLS-filtered write (0 rows, no
  // error) as a real failure instead of a false "saved" — same guard as
  // updateRequestStatusAction above.
  const { data: updated, error } = await supabase.from('admins').update({ full_name: fullName }).eq('id', admin.id).select('id').maybeSingle()

  if (error || !updated) return { status: 'error', error: 'update_failed' }
  return { status: 'success' }
}

export async function updateAdminEmailAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  await requireAdmin()
  const email = String(formData.get('email') ?? '').trim()

  if (!email || !email.includes('@')) return { status: 'error', error: 'invalid_email' }

  const supabase = await createSupabaseServerClient()
  // Supabase sends a confirmation link to the new address; the account's
  // email only actually changes once that's clicked — this call succeeding
  // means "confirmation sent", not "email changed", which is what the
  // success message below says.
  const { error } = await supabase.auth.updateUser({ email })
  if (error) return { status: 'error', error: 'update_failed' }

  return { status: 'success' }
}

export type ChangePasswordState = SettingsActionState

export async function changeAdminPasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  await requireAdmin()
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (password.length < 8) return { status: 'error', error: 'password_too_short' }
  if (password !== confirmPassword) return { status: 'error', error: 'password_mismatch' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { status: 'error', error: 'update_failed' }

  return { status: 'success' }
}

// Shared by both reset-request entry points below (the authenticated
// Settings page and the logged-out /admin/login "forgot password" block) —
// one real call to Supabase, one redirect URL convention, never duplicated.
// Supabase's recovery link carries a PKCE `code`, not a session by itself —
// it must first pass through our own /auth/callback route (which turns that
// code into a real session via exchangeCodeForSession) before landing on
// the page that actually sets the new password.
async function sendAdminPasswordResetEmail(email: string): Promise<SettingsActionState> {
  const supabase = await createSupabaseServerClient()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: appUrl ? `${appUrl}/auth/callback?next=/admin/reset-password` : undefined,
  })
  if (error) return { status: 'error', error: 'update_failed' }

  return { status: 'success' }
}

export async function requestAdminPasswordResetAction(): Promise<SettingsActionState> {
  const admin = await requireAdmin()
  return sendAdminPasswordResetEmail(admin.email)
}

// Logged-out counterpart used by the "Mot de passe oublié ?" block on
// /admin/login — takes the email straight from the form instead of an
// authenticated session, since there isn't one yet at that point. Always
// returns the same generic success/error shape regardless of whether the
// address actually belongs to an admin account (Supabase's own
// resetPasswordForEmail already never confirms account existence either),
// so this can't be used to enumerate which emails are registered.
export async function requestPasswordResetByEmailAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email || !email.includes('@')) return { status: 'error', error: 'invalid_email' }

  return sendAdminPasswordResetEmail(email)
}

export type ResetPasswordState = SettingsActionState

// Finalizes a Supabase password-recovery flow: called from
// /admin/reset-password *after* /auth/callback has already exchanged the
// recovery code for a real session (see requestAdminPasswordResetAction
// above). This performs the real auth.updateUser() call — never a fake or
// client-only "success" — and requires an actual active session to do it,
// exactly like changeAdminPasswordAction, just without requireAdmin() since
// the caller isn't necessarily inside an already-authenticated admin visit.
export async function updateRecoveredPasswordAction(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (password.length < 8) return { status: 'error', error: 'password_too_short' }
  if (password !== confirmPassword) return { status: 'error', error: 'password_mismatch' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { status: 'error', error: 'invalid_session' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { status: 'error', error: 'update_failed' }

  // End the recovery session so the admin logs back in fresh with the new
  // password, rather than being left signed in from the recovery link.
  await supabase.auth.signOut()

  return { status: 'success' }
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

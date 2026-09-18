import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'

export type AuthenticatedAdmin = {
  id: string
  email: string
  fullName: string | null
  role: string | null
  // Real value from Supabase Auth's own getUser() response below — never
  // fabricated. Reflects when the current session's sign-in happened (Auth
  // updates it at that moment), so within one session this stays constant;
  // it's the same "last login" semantics Supabase Auth itself exposes, not
  // a separate audit log this app doesn't have.
  lastSignInAt: string | null
}

// The DAL's single source of truth for "is this request an active admin".
// Two checks, both server-side and both required:
//  1. getUser() — validates the JWT against Supabase Auth (not just a local
//     cookie decode; this is what Supabase's own guidance requires for any
//     authorization decision).
//  2. rpc('is_admin') — a SECURITY DEFINER Postgres function that checks
//     public.admins for this user with is_active = true. Calling it through
//     the user's own authenticated client means the boolean comes from the
//     database itself, not from anything we could get wrong client-side.
//
// Never resolves for a non-admin: it redirects instead. Call this at the
// top of every admin page, layout, Server Action, and Route Handler.
export async function requireAdmin(): Promise<AuthenticatedAdmin> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')

  if (!isAdmin) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=not_admin')
  }

  const { data: profile } = await supabase.from('admins').select('full_name, role').eq('id', user.id).maybeSingle()

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: (profile?.full_name as string | undefined) ?? null,
    role: (profile?.role as string | undefined) ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}

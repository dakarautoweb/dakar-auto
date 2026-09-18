import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'

// Single SSR entry point for Supabase email links that carry a PKCE `code`
// (password recovery today; the same route works for any future magic-link/
// email-confirmation flow that redirects here). exchangeCodeForSession()
// sets the real session cookies on this response — a Server Component
// couldn't do this (cookies are read-only there), which is why this must be
// a Route Handler.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  // Only ever redirect back into our own /admin/* pages — never let `next`
  // be used as an open redirect to an arbitrary external URL.
  const safeNext = next && next.startsWith('/admin/') ? next : '/admin/login'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/admin/reset-password?error=invalid_link`)
}

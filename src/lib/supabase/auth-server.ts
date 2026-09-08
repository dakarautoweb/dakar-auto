import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Authenticated, RLS-respecting Supabase client for Server Components,
// Server Actions and Route Handlers. Uses the signed-in admin's own session
// (via cookies) — reads/writes are governed by RLS policies (gated by the
// existing public.is_admin() function), never by the service role key.
//
// Must be created fresh per request — never module-level singleton.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written — the proxy-level session refresh (src/lib/supabase/
          // middleware.ts) is what keeps the session alive in that case.
        }
      },
    },
  })
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLocale, localeCookieName } from '@/src/i18n/config'
import { refreshSupabaseSession } from '@/src/lib/supabase/proxy-session'

// French is the default locale for every visitor. We only ever set the
// cookie once, on first visit; after that the user's own choice (via the
// language switcher) or this default sticks until they change it again.
function applyDefaultLocale(request: NextRequest, response: NextResponse): NextResponse {
  if (request.cookies.has(localeCookieName)) {
    return response
  }
  response.cookies.set(localeCookieName, defaultLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    // Refreshes the Supabase session cookie on every /admin request so it
    // doesn't expire mid-visit. This is an optimistic (cookie-only) check —
    // it only confirms *some* authenticated session exists, never whether
    // that user is an active admin. The authoritative check against
    // public.admins (via is_admin()) happens server-side in the admin
    // layout, as recommended for Proxy-based auth.
    const { response, user } = await refreshSupabaseSession(request)

    if (!user && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return applyDefaultLocale(request, response)
  }

  return applyDefaultLocale(request, NextResponse.next())
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

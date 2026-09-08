import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLocale, localeCookieName } from '@/src/i18n/config'

// French is the default locale for every visitor. We only ever set the
// cookie once, on first visit; after that the user's own choice (via the
// language switcher) or this default sticks until they change it again.
export function proxy(request: NextRequest) {
  if (request.cookies.has(localeCookieName)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  response.cookies.set(localeCookieName, defaultLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

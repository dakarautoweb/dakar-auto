import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { locales, defaultLocale, localeCookieName, type Locale } from '@/src/i18n/config'

function detectLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language')
  if (!acceptLanguage) return defaultLocale

  const preferred = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0].trim().split('-')[0].toLowerCase())

  const match = preferred.find((lang) => locales.includes(lang as Locale))
  return (match as Locale | undefined) ?? defaultLocale
}

export function proxy(request: NextRequest) {
  if (request.cookies.has(localeCookieName)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  response.cookies.set(localeCookieName, detectLocale(request), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

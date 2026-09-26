'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { locales, localeCookieName, type Locale } from '@/src/i18n/config'
import { withViewTransition } from '@/src/lib/view-transition'

// Module-level on purpose: writing a browser global from inside the
// component body trips react-hooks/immutability; the cookie write itself is
// unchanged.
function persistLocale(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`
}

export function LanguageSwitcher({
  current,
  label,
  dark = false,
  size = 'md',
}: {
  current: Locale
  label: string
  // Sits on the permanently-dark header chrome (see globals.css
  // --header-* tokens) — that bar doesn't follow the page theme, so its
  // controls need fixed light-on-dark colors instead of the normal
  // theme-reactive ones. Unused (false) everywhere else, e.g. inside the
  // mobile menu's theme-reactive dropdown panel and the admin header.
  dark?: boolean
  // 'lg' is for touch contexts (the admin mobile drawer) where a 32px
  // EN/FR target is too small to hit reliably — 44px tall, matching the
  // rest of that drawer's controls. 'md' everywhere else, unchanged.
  size?: 'md' | 'lg'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function switchTo(locale: Locale) {
    if (locale === current) return
    persistLocale(locale)
    withViewTransition(() => startTransition(() => router.refresh()))
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center gap-1 rounded-full border p-1 text-sm font-medium ${dark ? 'border-white/20' : 'border-border'}`}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(locale)}
          aria-current={locale === current}
          className={`flex items-center justify-center rounded-full uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 ${
            size === 'lg' ? 'h-11 min-w-12 px-4 text-[15px] font-semibold' : 'h-8 min-w-8 px-2'
          } ${
            locale === current
              ? 'bg-accent text-accent-foreground'
              : dark
                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}

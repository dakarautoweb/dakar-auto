'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { locales, localeCookieName, type Locale } from '@/src/i18n/config'

export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale
  label: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function switchTo(locale: Locale) {
    if (locale === current) return
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 text-sm font-medium">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(locale)}
          aria-current={locale === current}
          className={`rounded px-2 py-1 uppercase transition-colors disabled:opacity-50 ${
            locale === current
              ? 'bg-foreground text-background'
              : 'hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}

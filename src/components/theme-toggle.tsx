'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { themeCookieName, type Theme } from '@/src/i18n/config'

export function ThemeToggle({
  current,
  labels,
}: {
  current: Theme
  labels: { light: string; dark: string }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.cookie = `${themeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={current === 'dark' ? labels.light : labels.dark}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-lg leading-none transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
    >
      {current === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

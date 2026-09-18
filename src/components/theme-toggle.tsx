'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { themeCookieName, type Theme } from '@/src/i18n/config'
import { iconButtonClasses } from '@/src/components/ui/styles'
import { MoonIcon, SunIcon } from '@/src/components/home/icons'
import { withViewTransition } from '@/src/lib/view-transition'

export function ThemeToggle({
  current,
  labels,
  variant = 'secondary',
  size = 'sm',
}: {
  current: Theme
  labels: { light: string; dark: string }
  // 'overlay' is for sitting on the permanently-dark header chrome
  // (see globals.css --header-* tokens) — the header doesn't itself
  // follow the page theme, so its controls can't use the theme-reactive
  // 'secondary' look.
  variant?: 'secondary' | 'overlay'
  // 'md' (44px) is for touch contexts — the admin mobile drawer, where it
  // has to carry the same visual weight as the large EN/FR switcher next
  // to it. 'sm' (40px) everywhere else, unchanged.
  size?: 'sm' | 'md'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    withViewTransition(() => {
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.cookie = `${themeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`
      startTransition(() => router.refresh())
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={current === 'dark' ? labels.light : labels.dark}
      className={iconButtonClasses({ size, variant, className: 'overflow-hidden' })}
    >
      <span className={`relative flex items-center justify-center ${size === 'md' ? 'h-[22px] w-[22px]' : 'h-[18px] w-[18px]'}`}>
        <SunIcon
          className={`absolute h-full w-full transition duration-300 ${current === 'dark' ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`}
        />
        <MoonIcon
          className={`absolute h-full w-full transition duration-300 ${current === 'dark' ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}
        />
      </span>
    </button>
  )
}

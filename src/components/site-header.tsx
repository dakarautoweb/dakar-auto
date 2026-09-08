import Link from 'next/link'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'

export function SiteHeader({
  locale,
  theme,
  dict,
}: {
  locale: Locale
  theme: Theme
  dict: Dictionary
}) {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {dict.header.siteName}
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/">{dict.header.nav.home}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
          <ThemeToggle current={theme} labels={dict.header.themeToggle} />
        </div>
      </div>
    </header>
  )
}

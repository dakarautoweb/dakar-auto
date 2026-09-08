import Link from 'next/link'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { MobileMenu } from './mobile-menu'

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
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          DAKAR <span className="text-accent">AUTO</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/80 md:flex">
          <Link href="/" className="transition-colors hover:text-foreground">
            {dict.header.nav.home}
          </Link>
          <Link href="/#parts-categories" className="transition-colors hover:text-foreground">
            {dict.header.nav.parts}
          </Link>
          <Link href="/#source-a-vehicle" className="transition-colors hover:text-foreground">
            {dict.header.nav.sourceVehicle}
          </Link>
          <Link href="/#about" className="transition-colors hover:text-foreground">
            {dict.header.nav.about}
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-foreground">
            {dict.header.nav.contact}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
          <ThemeToggle current={theme} labels={dict.header.themeToggle} />
          <Link
            href="/#hero-request"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
          >
            {dict.header.quoteCta}
          </Link>
        </div>

        <MobileMenu locale={locale} theme={theme} dict={dict} />
      </div>
    </header>
  )
}

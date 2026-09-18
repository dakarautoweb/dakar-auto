'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { MobileMenu } from './mobile-menu'
import { SendIcon } from './home/icons'

export function SiteHeader({
  locale,
  theme,
  dict,
}: {
  locale: Locale
  theme: Theme
  dict: Dictionary
}) {
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: dict.header.nav.home },
    { href: '/parts', label: dict.header.nav.parts },
    { href: '/source-a-vehicle', label: dict.header.nav.sourceVehicle },
    { href: '/about', label: dict.header.nav.about },
    { href: '/#contact', label: dict.header.nav.contact },
  ]

  const linksWithState = navLinks.map((link) => ({
    ...link,
    isActive: link.href === '/' ? pathname === '/' : !link.href.startsWith('/#') && pathname === link.href,
  }))

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-header-bg/90 text-header-foreground shadow-[0_1px_0_0_rgba(0,0,0,0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-header-bg/75">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="absolute left-1/2 flex shrink-0 -translate-x-1/2 items-center xl:static xl:left-auto xl:translate-x-0"
        >
          {/* Real brand lockup (icon + wordmark + tagline baked in) — this
              header stays permanently dark so the light-on-dark logo is
              always legible (see globals.css --header-* tokens).
              dakar-auto-logo-header.png is a tight, non-destructive crop of
              the master dakar-auto-logo.png (that file has ~55% vertical
              transparent padding baked in, which made the wordmark render
              far smaller than the h-* box would suggest) — see
              public/brand/dakar-auto-logo-header.png. The navbar height
              itself (h-16 on the row above) is untouched; only the visible
              glyph is bigger now that the box isn't mostly empty space.
              Below xl (where the nav capsule/CTA are hidden behind the
              burger menu) the logo is absolutely centered in the header
              row instead of sitting flush left next to a lone right-side
              burger button — desktop (xl+) goes back to the normal
              in-flow left position. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/dakar-auto-logo-header.png" alt="Dakar Auto" className="h-11 w-auto sm:h-14" />
        </Link>

        {/* Premium glass capsule — every nav item lives inside the same
            rounded container, active item is a filled orange pill, thin
            hairline separators only sit between two inactive neighbors so
            they never touch the pill itself. */}
        <nav className="hidden items-center rounded-full border border-white/10 bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_18px_-6px_rgba(0,0,0,0.5)] xl:flex">
          {linksWithState.map((link, i) => {
            const prev = linksWithState[i - 1]
            const showSeparator = i > 0 && !prev.isActive && !link.isActive
            return (
              <span key={link.href} className="flex items-center">
                {showSeparator && <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/10" />}
                <Link
                  href={link.href}
                  aria-current={link.isActive ? 'page' : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    link.isActive
                      ? 'bg-accent text-white shadow-glow'
                      : 'text-header-foreground/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              </span>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2.5 xl:flex">
          <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} dark />
          <ThemeToggle current={theme} labels={dict.header.themeToggle} variant="overlay" />
          <Link href="/#hero-request" className={buttonClasses({ variant: 'primary', size: 'sm', pill: true })}>
            {dict.header.quoteCta}
            <SendIcon className="h-4 w-4" />
          </Link>
        </div>

        <MobileMenu locale={locale} theme={theme} dict={dict} />
      </div>
    </header>
  )
}

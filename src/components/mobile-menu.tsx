'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'

export function MobileMenu({
  locale,
  theme,
  dict,
}: {
  locale: Locale
  theme: Theme
  dict: Dictionary
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Client-only mount flag, gating the createPortal call below —
    // document.body doesn't exist during SSR. Same targeted exception
    // React's own docs carve out for syncing with an external system
    // (see the identical pattern/comment on AdminClock in admin-top-header.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const links = [
    { href: '/', label: dict.header.nav.home },
    { href: '/parts', label: dict.header.nav.parts },
    { href: '/vehicles', label: dict.header.nav.inventory },
    { href: '/source-a-vehicle', label: dict.header.nav.sourceVehicle },
    { href: '/about', label: dict.header.nav.about },
    { href: '/#contact', label: dict.header.nav.contact },
    { href: '/faq', label: dict.header.nav.faq },
    { href: '/track', label: dict.header.nav.track },
  ]
  // Track and FAQ stay reachable (hero feature strip, tracking emails,
  // footer link) even though they're dropped from the primary nav to match
  // the reference's 5-item header; kept last here as lower-emphasis links.

  // Portaled to document.body instead of rendered inline: <header> has
  // backdrop-blur-xl (a backdrop-filter), which per spec makes it a
  // containing block for `position: fixed` descendants — this drawer's
  // `top-16 bottom-0` was resolving against the *header's own* 64px-tall
  // box instead of the viewport, collapsing the whole overlay to a
  // sliver instead of covering the screen. Escaping to <body> via a
  // portal sidesteps that entirely; the trigger button stays put in the
  // header so layout/centering there is unaffected.
  const drawer = (
    <div
      aria-hidden={!open}
      className={`fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-header-bg/98 px-6 py-8 text-header-foreground backdrop-blur-xl transition duration-300 ease-out ${
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
    >
      <nav className="flex flex-col gap-1.5 text-lg font-medium">
        {links.map((link, i) => {
          const isActive = link.href === '/' ? pathname === '/' : !link.href.startsWith('/#') && pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              aria-current={isActive ? 'page' : undefined}
              style={{ transitionDelay: open ? `${i * 30}ms` : '0ms' }}
              className={`rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-300 ${
                open ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
              } ${isActive ? 'bg-accent text-white shadow-glow' : 'hover:border-white/10 hover:bg-white/5 hover:text-accent'}`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
        <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} dark />
        <ThemeToggle current={theme} labels={dict.header.themeToggle} variant="overlay" />
      </div>

      <Link
        href="/#hero-request"
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, pill: true, className: 'mt-6' })}
      >
        {dict.header.quoteCta}
      </Link>
    </div>
  )

  return (
    // ml-auto: below xl the logo is absolutely centered (see site-header.tsx)
    // and out of the flex flow, so this burger button is briefly the only
    // in-flow child — margin-left:auto is what keeps it pinned to the
    // right edge instead of collapsing to the row's start.
    <div className="ml-auto xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? dict.header.menuClose : dict.header.menuOpen}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 transition duration-200 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-header-bg"
      >
        <span
          className={`absolute h-0.5 w-5 bg-white transition-transform duration-200 ${open ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`}
        />
        <span className={`absolute h-0.5 w-5 bg-white transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`} />
        <span
          className={`absolute h-0.5 w-5 bg-white transition-transform duration-200 ${open ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'}`}
        />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </div>
  )
}

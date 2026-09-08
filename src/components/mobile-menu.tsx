'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
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
    { href: '/#parts-categories', label: dict.header.nav.parts },
    { href: '/#source-a-vehicle', label: dict.header.nav.sourceVehicle },
    { href: '/#about', label: dict.header.nav.about },
    { href: '/#contact', label: dict.header.nav.contact },
  ]

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? dict.header.menuClose : dict.header.menuOpen}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border"
      >
        <span
          className={`absolute h-0.5 w-5 bg-foreground transition-transform ${open ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`}
        />
        <span className={`absolute h-0.5 w-5 bg-foreground transition-opacity ${open ? 'opacity-0' : 'opacity-100'}`} />
        <span
          className={`absolute h-0.5 w-5 bg-foreground transition-transform ${open ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'}`}
        />
      </button>

      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-background px-6 py-8">
          <nav className="flex flex-col gap-1 text-lg font-medium">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 hover:bg-surface"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
            <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
            <ThemeToggle current={theme} labels={dict.header.themeToggle} />
          </div>

          <Link
            href="/#hero-request"
            onClick={() => setOpen(false)}
            className="mt-6 block rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-accent-foreground"
          >
            {dict.header.quoteCta}
          </Link>
        </div>
      )}
    </div>
  )
}

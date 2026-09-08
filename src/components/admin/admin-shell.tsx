'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { LanguageSwitcher } from '@/src/components/language-switcher'
import { ThemeToggle } from '@/src/components/theme-toggle'
import { logoutAdminAction } from '@/src/services/admin/actions'
import type { AuthenticatedAdmin } from '@/src/services/admin/auth'

function NavLinks({ dict, pathname, onNavigate }: { dict: Dictionary; pathname: string; onNavigate?: () => void }) {
  const links = [
    { href: '/admin', label: dict.admin.nav.dashboard, exact: true },
    { href: '/admin/requests', label: dict.admin.nav.requests, exact: false },
    { href: '/admin/vehicle-requests', label: dict.admin.nav.vehicleRequests, exact: false },
  ]

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active ? 'bg-accent-soft text-accent' : 'text-foreground/80 hover:bg-surface hover:text-foreground'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

function LogoutButton({ label }: { label: string }) {
  return (
    <form action={logoutAdminAction}>
      <button
        type="submit"
        className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition hover:bg-surface hover:text-foreground"
      >
        {label}
      </button>
    </form>
  )
}

export function AdminShell({
  admin,
  locale,
  theme,
  dict,
  children,
}: {
  admin: AuthenticatedAdmin
  locale: Locale
  theme: Theme
  dict: Dictionary
  children: ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface/40 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="text-base font-bold tracking-tight">
            {dict.admin.brand} <span className="text-accent">{dict.admin.brandSuffix}</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <NavLinks dict={dict} pathname={pathname} />
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
              <ThemeToggle current={theme} labels={dict.header.themeToggle} />
            </div>
            <div className="truncate rounded-lg px-3 py-1 text-xs text-muted-foreground" title={admin.email}>
              {admin.fullName ?? admin.email}
            </div>
            <LogoutButton label={dict.admin.nav.logout} />
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="text-base font-bold tracking-tight">
            {dict.admin.brand} <span className="text-accent">{dict.admin.brandSuffix}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? dict.header.menuClose : dict.header.menuOpen}
          aria-expanded={mobileOpen}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border"
        >
          <span
            className={`absolute h-0.5 w-5 bg-foreground transition-transform ${mobileOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`}
          />
          <span className={`absolute h-0.5 w-5 bg-foreground transition-opacity ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
          <span
            className={`absolute h-0.5 w-5 bg-foreground transition-transform ${mobileOpen ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'}`}
          />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-background px-4 py-6 lg:hidden">
          <NavLinks dict={dict} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
            <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
            <ThemeToggle current={theme} labels={dict.header.themeToggle} />
          </div>
          <div className="mt-4 truncate px-3 text-xs text-muted-foreground">{admin.fullName ?? admin.email}</div>
          <div className="mt-2">
            <LogoutButton label={dict.admin.nav.logout} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}

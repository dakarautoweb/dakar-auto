'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import type { Locale, Theme } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { LanguageSwitcher } from '@/src/components/language-switcher'
import { ThemeToggle } from '@/src/components/theme-toggle'
import { logoutAdminAction } from '@/src/services/admin/actions'
import type { AuthenticatedAdmin } from '@/src/services/admin/auth'
import type { NewRequestsBadgeCounts } from '@/src/services/admin/queries'
import { AdminTopHeader } from './admin-top-header'
import {
  ClientsFilledIcon,
  DashboardFilledIcon,
  FaqFilledIcon,
  InventoryFilledIcon,
  PartsFilledIcon,
  RequestsFilledIcon,
  SettingsFilledIcon,
  StatisticsFilledIcon,
  SuppliersFilledIcon,
  VehicleFilledIcon,
} from './nav-icons'

// 'drawer' is the mobile slide-over: everything is sized up to real touch
// targets (52-56px rows, 24px icons, 17px labels) and the badges become
// readable pills instead of the sidebar's 20px dots. 'sidebar' is the
// lg+ rail — unchanged, and the default, so nothing else can drift.
type NavVariant = 'sidebar' | 'drawer'

function NavBadge({ count, variant }: { count: number; variant: NavVariant }) {
  if (count <= 0) return null
  return (
    <span
      className={`ml-auto flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground ${
        variant === 'drawer' ? 'h-7 min-w-7 px-2 text-[13px]' : 'h-5 min-w-5 px-1.5 text-[11px]'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

// One neutral graphite tone for every inactive icon — a previous per-item
// rainbow palette (amber/blue/pink/cyan/orange/yellow/slate) read as busy
// and inconsistent in visual density; a single `text-muted-foreground`
// (theme-reactive already: warm gray in light, cool gray in dark) is the
// "solid, premium, uniform" look the design brief asks for. The active
// row's own orange gradient fill still turns its icon white via
// `text-white` below, and hover lightens toward `text-foreground` — badges
// are a fully separate <span> (NavBadge) and never touch this color.
const INACTIVE_ICON_CLASS = 'text-muted-foreground group-hover:text-foreground'

function NavLinks({
  dict,
  pathname,
  badges,
  onNavigate,
  variant = 'sidebar',
}: {
  dict: Dictionary
  pathname: string
  badges: NewRequestsBadgeCounts
  onNavigate?: () => void
  variant?: NavVariant
}) {
  const drawer = variant === 'drawer'
  const links = [
    { href: '/admin', label: dict.admin.nav.dashboard, exact: true, icon: DashboardFilledIcon, badge: 0 },
    { href: '/admin/requests', label: dict.admin.nav.requests, exact: false, icon: RequestsFilledIcon, badge: badges.parts },
    { href: '/admin/vehicle-requests', label: dict.admin.nav.vehicleRequests, exact: false, icon: VehicleFilledIcon, badge: badges.vehicles },
    { href: '/admin/clients', label: dict.admin.nav.clients, exact: false, icon: ClientsFilledIcon, badge: 0 },
    { href: '/admin/parts', label: dict.admin.nav.parts, exact: false, icon: PartsFilledIcon, badge: 0 },
    { href: '/admin/suppliers', label: dict.admin.nav.suppliers, exact: false, icon: SuppliersFilledIcon, badge: 0 },
    { href: '/admin/vehicles', label: dict.admin.nav.inventory, exact: false, icon: InventoryFilledIcon, badge: 0 },
    { href: '/admin/statistics', label: dict.admin.nav.statistics, exact: false, icon: StatisticsFilledIcon, badge: 0 },
    { href: '/admin/faq', label: dict.admin.nav.faq, exact: false, icon: FaqFilledIcon, badge: 0 },
    { href: '/admin/settings', label: dict.admin.nav.settings, exact: false, icon: SettingsFilledIcon, badge: 0 },
  ]

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center rounded-xl transition duration-200 ${
              drawer ? 'min-h-[54px] gap-3.5 px-4 py-3 text-[17px] font-semibold' : 'gap-3 px-3 py-2.5 text-sm font-medium'
            } ${
              active
                ? 'bg-gradient-to-br from-accent to-orange-600 text-white shadow-[var(--glow-shadow)]'
                : 'text-foreground/80 hover:bg-surface hover:text-foreground'
            }`}
          >
            <Icon
              className={`shrink-0 transition duration-200 group-hover:scale-110 ${drawer ? 'h-6 w-6' : 'h-5 w-5'} ${
                active ? 'text-white' : INACTIVE_ICON_CLASS
              }`}
            />
            <span className="truncate">{link.label}</span>
            {link.badge > 0 &&
              (active ? (
                <span
                  className={`ml-auto flex shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white ${
                    drawer ? 'h-7 min-w-7 px-2 text-[13px]' : 'h-5 min-w-5 px-1.5 text-[11px]'
                  }`}
                >
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              ) : (
                <NavBadge count={link.badge} variant={variant} />
              ))}
          </Link>
        )
      })}
    </nav>
  )
}

function LogoutButton({ label, variant = 'sidebar' }: { label: string; variant?: NavVariant }) {
  const drawer = variant === 'drawer'
  return (
    <form action={logoutAdminAction}>
      <button
        type="submit"
        className={`group flex w-full items-center rounded-xl text-left text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground ${
          drawer ? 'min-h-[54px] gap-3.5 px-4 py-3 text-[17px] font-semibold' : 'gap-3 px-3 py-2.5 text-sm font-medium'
        }`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg bg-surface transition duration-200 group-hover:scale-110 group-hover:bg-red-500/10 group-hover:text-red-500 ${
            drawer ? 'h-10 w-10' : 'h-8 w-8'
          }`}
        >
          <LogOut className={drawer ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={2} />
        </span>
        {label}
      </button>
    </form>
  )
}

// Small uppercase group heading inside the mobile drawer — the thing that
// turns one undifferentiated list of rows into Navigation / Preferences /
// Account.
function DrawerGroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-4 pb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{children}</p>
}

export function AdminShell({
  admin,
  locale,
  theme,
  dict,
  badges,
  children,
}: {
  admin: AuthenticatedAdmin
  locale: Locale
  theme: Theme
  dict: Dictionary
  badges: NewRequestsBadgeCounts
  children: ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const identityLabel = admin.fullName ?? admin.email
  const firstName = identityLabel.trim().split(/\s+/)[0]
  const initial = identityLabel.trim().charAt(0).toUpperCase()

  // dakar-auto-logo-header.png's DAKAR/WEB wordmark and car-icon outline are
  // near-white — illegible on this sidebar's light-theme bg-surface. The
  // "-light" variant is a derived asset (same crop/size, gold "AUTO" +
  // arrow/circle mark untouched) with just those white elements darkened to
  // graphite; the master/header assets themselves are untouched, and every
  // other logo placement (public header, login, VIN result brand marks)
  // keeps using the original file.
  const logoSrc = theme === 'light' ? '/brand/dakar-auto-logo-header-light.png' : '/brand/dakar-auto-logo-header.png'

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-20 items-center border-b border-border px-4">
          {/* dakar-auto-logo-header.png is the same tight, non-destructive
              crop of the master dakar-auto-logo.png used by the public
              header (see site-header.tsx) — the master has ~55% vertical
              transparent padding baked in, which made the wordmark render
              far smaller than the h-* box suggested. Sidebar row height
              (h-20) and the master asset itself are both untouched; only
              the visible glyph is bigger now that the box isn't mostly
              empty space. Width is comfortably inside the w-64 sidebar's
              content area (px-4) at this height — verified against the
              crop's real 4.198:1 aspect ratio, not guessed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Dakar Auto" className="h-[52px] w-auto" />
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <NavLinks dict={dict} pathname={pathname} badges={badges} />
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 shadow-card">
              <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
              <ThemeToggle current={theme} labels={dict.header.themeToggle} />
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-1.5" title={admin.email}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                {initial}
              </span>
              <span className="truncate text-xs font-medium text-muted-foreground">{identityLabel}</span>
            </div>
            <LogoutButton label={dict.admin.nav.logout} />
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        {/* Same tight crop as the desktop sidebar above — see the comment
            there. This row (h-16) has ample vertical and horizontal room
            for the bump, since the hamburger button on the right is a
            fixed 44px and the logo only needs to clear it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="Dakar Auto" className="h-12 w-auto" />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? dict.header.menuClose : dict.header.menuOpen}
          aria-expanded={mobileOpen}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border transition duration-200 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span
            className={`absolute h-0.5 w-5 bg-foreground transition-transform duration-200 ${mobileOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`}
          />
          <span className={`absolute h-0.5 w-5 bg-foreground transition-opacity duration-200 ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
          <span
            className={`absolute h-0.5 w-5 bg-foreground transition-transform duration-200 ${mobileOpen ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'}`}
          />
        </button>
      </header>

      {mobileOpen && (
        // z-[35]: strictly between the mobile header's z-40 (so its own
        // close/X toggle always stays clickable on top) and
        // AdminTopHeader's z-30 (a `sticky top-0` element inside <main>
        // that, tied at the same z-30, would otherwise win on DOM order
        // alone and paint its greeting/search bar over this drawer's own
        // top nav items whenever the drawer is open).
        // px-2 on the panel + px-4 on each row: the group dividers below are
        // plain `border-t` on the section wrappers, so they run the full
        // width of the panel's content box rather than stopping at a row's
        // own inset — the "short divider stubs" the brief called out.
        <div className="fixed inset-x-0 top-16 bottom-0 z-[35] overflow-y-auto bg-background px-2 py-4 lg:hidden">
          <DrawerGroupLabel>{dict.admin.nav.groupNavigation}</DrawerGroupLabel>
          <NavLinks dict={dict} pathname={pathname} badges={badges} onNavigate={() => setMobileOpen(false)} variant="drawer" />

          <div className="mt-4 border-t border-border pt-4">
            <DrawerGroupLabel>{dict.admin.nav.groupPreferences}</DrawerGroupLabel>
            <div className="flex min-h-[54px] items-center justify-between gap-3 px-4 py-2">
              <span className="text-[17px] font-semibold text-foreground/80">{dict.header.languageSwitcher}</span>
              <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} size="lg" />
            </div>
            <div className="flex min-h-[54px] items-center justify-between gap-3 px-4 py-2">
              <span className="text-[17px] font-semibold text-foreground/80">{dict.admin.nav.theme}</span>
              <ThemeToggle current={theme} labels={dict.header.themeToggle} size="md" />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <DrawerGroupLabel>{dict.admin.nav.groupAccount}</DrawerGroupLabel>
            <div className="flex min-h-[54px] items-center gap-3.5 px-4 py-2" title={admin.email}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[15px] font-bold text-accent">
                {initial}
              </span>
              <span className="min-w-0 truncate text-[17px] font-semibold text-foreground/80">{identityLabel}</span>
            </div>
            <LogoutButton label={dict.admin.nav.logout} variant="drawer" />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <AdminTopHeader dict={dict} locale={locale} adminName={firstName} />
        <div className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}

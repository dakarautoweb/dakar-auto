import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { ShieldCheck, Globe2, Sun, Moon, Clock, Wrench, Car, ExternalLink, ArrowRight } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { Locale, Theme } from '@/src/i18n/config'
import type { AuthenticatedAdmin } from '@/src/services/admin/auth'
import type { NewRequestsBadgeCounts } from '@/src/services/admin/queries'
import { cardClasses } from '@/src/components/ui/styles'

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

function ProfileRow({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        {label}
      </span>
      <span className="truncate text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}

// Only ever shows real values — no field here is guessed or hardcoded
// beyond "Admin" (which is what every row in public.admins that passes
// requireAdmin() actually is, per its RLS-backed is_admin() check; the
// exact `admins.role` column value is still what's displayed, not a
// literal string). lastSignInAt comes straight from Supabase Auth's own
// getUser() response (see requireAdmin() in auth.ts) — if it's ever null,
// the row is simply omitted rather than showing a made-up date.
export function AdminProfileCard({
  dict,
  admin,
  locale,
  theme,
}: {
  dict: Dictionary
  admin: AuthenticatedAdmin
  locale: Locale
  theme: Theme
}) {
  const t = dict.admin.settingsPage
  const identityLabel = admin.fullName ?? admin.email
  const initial = identityLabel.trim().charAt(0).toUpperCase()
  const lastLogin = admin.lastSignInAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(admin.lastSignInAt))
    : null

  return (
    <section className={cardClasses({ padding: 'sm' })}>
      <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.profileSection}</h2>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-bold text-accent">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{identityLabel}</p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-border border-t border-border">
        <ProfileRow icon={ShieldCheck} label={t.roleLabel} value={admin.role ?? t.roleAdmin} />
        <ProfileRow icon={Globe2} label={t.languageLabel} value={locale.toUpperCase()} />
        <ProfileRow icon={theme === 'light' ? Sun : Moon} label={t.themeLabel} value={theme === 'light' ? t.themeValueLight : t.themeValueDark} />
        {lastLogin && <ProfileRow icon={Clock} label={t.lastLoginLabel} value={lastLogin} />}
      </div>
    </section>
  )
}

function QuickActionRow({
  href,
  icon: Icon,
  label,
  hint,
  external = false,
}: {
  href: string
  icon: IconType
  label: string
  hint?: string
  external?: boolean
}) {
  const content: ReactNode = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
        strokeWidth={2}
      />
    </>
  )
  const className =
    'group flex items-center gap-3 rounded-xl border border-border p-3 transition duration-200 hover:border-accent-hover hover:bg-accent-soft/30'

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  )
}

// Three real, reachable actions only — "Export data / Reports" was
// considered and deliberately left out: the existing export flow lives
// entirely inside AdminDataTable's own toolbar (tied to a specific table's
// current rows/filters), there's no standalone route it can correctly open
// from here, and a link to the read-only Statistics page wouldn't actually
// be "opening the export flow." Badge counts reuse the exact same
// getNewRequestsBadgeCounts() the sidebar nav badges already call — no
// second source of truth.
export function QuickActionsCard({ dict, badges }: { dict: Dictionary; badges: NewRequestsBadgeCounts }) {
  const t = dict.admin.settingsPage

  return (
    <section className={cardClasses({ padding: 'sm' })}>
      <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.quickActionsSection}</h2>
      <div className="space-y-2">
        <QuickActionRow
          href="/admin/requests"
          icon={Wrench}
          label={dict.admin.nav.requests}
          hint={badges.parts > 0 ? t.quickActionNewCount.replace('{count}', String(badges.parts)) : t.quickActionPartsHint}
        />
        <QuickActionRow
          href="/admin/vehicle-requests"
          icon={Car}
          label={dict.admin.nav.vehicleRequests}
          hint={badges.vehicles > 0 ? t.quickActionNewCount.replace('{count}', String(badges.vehicles)) : t.quickActionVehiclesHint}
        />
        <QuickActionRow href="/" icon={ExternalLink} label={t.quickActionOpenSite} hint={t.quickActionOpenSiteHint} external />
      </div>
    </section>
  )
}

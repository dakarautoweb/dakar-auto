import type { ReactNode } from 'react'
import { requireAdmin } from '@/src/services/admin/auth'
import { getCurrentLocale, getCurrentTheme } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { AdminShell } from '@/src/components/admin/admin-shell'

// requireAdmin() is the authoritative access check for the whole dashboard
// — it redirects unauthenticated visitors to /admin/login and signs out /
// denies anyone authenticated who isn't an active row in public.admins.
// Proxy only does an optimistic "is there a session" redirect; this is
// where the real, database-backed decision happens.
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin()
  const locale = await getCurrentLocale()
  const theme = await getCurrentTheme()
  const dict = await getDictionary(locale)

  return (
    <AdminShell admin={admin} locale={locale} theme={theme} dict={dict}>
      {children}
    </AdminShell>
  )
}

import { Building2 } from 'lucide-react'
import { requireAdmin } from '@/src/services/admin/auth'
import { getCurrentLocale, getCurrentTheme } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getNewRequestsBadgeCounts } from '@/src/services/admin/queries'
import { LanguageSwitcher } from '@/src/components/language-switcher'
import { ThemeToggle } from '@/src/components/theme-toggle'
import { cardClasses } from '@/src/components/ui/styles'
import { NameForm, EmailForm, PasswordForm, ResetPasswordCard } from '@/src/components/admin/account-settings-forms'
import { CompanySettingsForm } from '@/src/components/admin/company-settings-form'
import { AdminProfileCard, QuickActionsCard } from '@/src/components/admin/settings-sidebar'
import { getAdminSiteSettings } from '@/src/services/site-settings/queries'

export default async function AdminSettingsPage() {
  const admin = await requireAdmin()
  const locale = await getCurrentLocale()
  const theme = await getCurrentTheme()
  const dict = await getDictionary(locale)
  const t = dict.admin.settingsPage
  const [companySettings, badges] = await Promise.all([getAdminSiteSettings(), getNewRequestsBadgeCounts()])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>

      {/* Settings' own content stays capped at max-w-3xl (unchanged); the
          sidebar rides alongside it on wide screens and drops underneath on
          narrow ones — a standard sidebar grid, not a redesign of the
          existing column's width or spacing. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,48rem)_18rem]">
        <div className="space-y-6">
          <section className={cardClasses({ padding: 'sm' })}>
            <h2 className="mb-5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.accountSection}</h2>
            <div className="space-y-6">
              <NameForm dict={dict} currentName={admin.fullName ?? ''} />
              <div className="border-t border-border" />
              <EmailForm dict={dict} currentEmail={admin.email} />
              <div className="border-t border-border" />
              <PasswordForm dict={dict} />
              <ResetPasswordCard dict={dict} />
            </div>
          </section>

          <section className={cardClasses({ padding: 'sm' })}>
            <h2 className="mb-5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.preferencesSection}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface/60 p-4">
                <span className="text-sm font-medium text-foreground">{t.languageLabel}</span>
                <LanguageSwitcher current={locale} label={dict.header.languageSwitcher} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface/60 p-4">
                <span className="text-sm font-medium text-foreground">{t.themeLabel}</span>
                <ThemeToggle current={theme} labels={dict.header.themeToggle} />
              </div>
            </div>
          </section>

          <section className={cardClasses({ padding: 'sm' })}>
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <Building2 className="h-4 w-4 text-accent" strokeWidth={2} />
              {t.companySection.title}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">{t.companySection.description}</p>
            <CompanySettingsForm dict={dict} settings={companySettings} />
          </section>
        </div>

        <div className="space-y-6">
          <AdminProfileCard dict={dict} admin={admin} locale={locale} theme={theme} />
          <QuickActionsCard dict={dict} badges={badges} />
        </div>
      </div>
    </div>
  )
}

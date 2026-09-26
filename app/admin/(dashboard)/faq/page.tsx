import { requireAdmin } from '@/src/services/admin/auth'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getAdminFaqItems } from '@/src/services/faq/queries'
import { FaqAdminManager } from '@/src/components/admin/faq-admin-manager'

export default async function AdminFaqPage() {
  await requireAdmin()
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const items = await getAdminFaqItems()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.admin.faqPage.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.admin.faqPage.subtitle}</p>
      </div>

      <FaqAdminManager dict={dict} items={items} />
    </div>
  )
}

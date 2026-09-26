import { requireAdmin } from '@/src/services/admin/auth'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getSupplierProviderStatuses } from '@/src/services/suppliers/supplier-service'
import { SuppliersAdminManager } from '@/src/components/admin/suppliers-admin-manager'

export default async function AdminSuppliersPage() {
  await requireAdmin()
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const providers = getSupplierProviderStatuses()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.admin.suppliersPage.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{dict.admin.suppliersPage.subtitle}</p>
      </div>

      <SuppliersAdminManager dict={dict} providers={providers} />
    </div>
  )
}

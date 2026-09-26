import { Car } from 'lucide-react'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getAdminVehicles } from '@/src/services/inventory/queries'
import { InventoryManager } from '@/src/components/admin/inventory-manager'

export default async function AdminVehiclesPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const vehicles = await getAdminVehicles()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Car className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.admin.inventoryPage.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dict.admin.inventoryPage.subtitle}</p>
        </div>
      </div>

      <InventoryManager dict={dict} locale={locale} vehicles={vehicles} />
    </div>
  )
}

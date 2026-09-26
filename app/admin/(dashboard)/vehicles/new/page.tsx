import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { InventoryForm } from '@/src/components/admin/inventory-form'

export default async function NewVehiclePage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.admin.inventoryPage

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/vehicles" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          {t.backToList}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Plus className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{t.form.addTitle}</h1>
        </div>
      </div>

      <InventoryForm dict={dict} vehicle={null} />

      <p className="text-center text-sm text-muted-foreground">{t.form.photosHint}</p>
    </div>
  )
}

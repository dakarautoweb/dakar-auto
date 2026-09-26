import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getAdminVehicleById } from '@/src/services/inventory/queries'
import { InventoryForm } from '@/src/components/admin/inventory-form'
import { InventoryPhotoManager } from '@/src/components/admin/inventory-photo-manager'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.admin.inventoryPage

  const vehicle = await getAdminVehicleById(id)
  if (!vehicle) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/vehicles" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          {t.backToList}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {t.form.editTitle} — {vehicle.make} {vehicle.model}
          </h1>
        </div>
      </div>

      <InventoryPhotoManager dict={dict} vehicleId={vehicle.id} photos={vehicle.photos} />

      <InventoryForm dict={dict} vehicle={vehicle} />
    </div>
  )
}

'use client'

import { useActionState, type ComponentType, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Car, ClipboardList, Eye } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { createVehicleAction, updateVehicleAction } from '@/src/services/inventory/actions'
import type { SettingsActionState } from '@/src/services/admin/actions'
import type { AdminVehicle } from '@/src/services/inventory/types'
import { VEHICLE_STATUSES } from '@/src/services/inventory/types'
import { buttonClasses, cardClasses, inputClass } from '@/src/components/ui/styles'
import { StatusLine } from './account-settings-forms'

const idle: SettingsActionState = { status: 'idle' }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  children: ReactNode
}) {
  return (
    <div className={cardClasses({ padding: 'md' })}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">{title}</h2>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

// Create/edit form for a vehicle, shared by both flows — `vehicle` present
// means edit (all fields prefilled, submitted to updateVehicleAction),
// absent means create (blank form, submitted to createVehicleAction, which
// redirects to the new vehicle's edit page on success so photo management
// becomes available). Rendered as a full page rather than FaqFormModal's
// modal — this form has far more fields plus a photo manager once editing,
// which doesn't fit a dialog well.
export function InventoryForm({ dict, vehicle }: { dict: Dictionary; vehicle: AdminVehicle | null }) {
  const t = dict.admin.inventoryPage.form
  const isEdit = vehicle !== null
  const router = useRouter()
  const [state, action, pending] = useActionState(isEdit ? updateVehicleAction : createVehicleAction, idle)

  const errorMap: Record<string, string> = {
    missing_make: t.errorMissingMake,
    missing_model: t.errorMissingModel,
    invalid_year: t.errorInvalidYear,
    invalid_mileage: t.errorInvalidMileage,
    invalid_price: t.errorInvalidPrice,
    save_failed: t.errorSaveFailed,
    invalid_id: t.errorSaveFailed,
    invalid_status: t.errorSaveFailed,
  }

  return (
    <form action={action} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={vehicle.id} />}

      <SectionCard title={t.sectionDetails} icon={Car}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t.makeLabel}>
            <input name="make" required maxLength={60} defaultValue={vehicle?.make ?? ''} className={inputClass} />
          </Field>
          <Field label={t.modelLabel}>
            <input name="model" required maxLength={60} defaultValue={vehicle?.model ?? ''} className={inputClass} />
          </Field>
          <Field label={t.yearLabel}>
            <input name="year" type="number" required min={1900} max={2100} defaultValue={vehicle?.year ?? ''} className={inputClass} />
          </Field>
          <Field label={t.engineDisplacementLabel}>
            <input name="engineDisplacement" placeholder={t.engineDisplacementPlaceholder} maxLength={40} defaultValue={vehicle?.engineDisplacement ?? ''} className={inputClass} />
          </Field>
          <Field label={t.colorLabel}>
            <input name="color" maxLength={40} defaultValue={vehicle?.color ?? ''} className={inputClass} />
          </Field>
          <Field label={t.mileageLabel}>
            <input name="mileage" type="number" min={0} defaultValue={vehicle?.mileage ?? ''} className={inputClass} />
          </Field>
          <Field label={t.transmissionLabel}>
            <input name="transmission" placeholder={t.transmissionPlaceholder} maxLength={40} defaultValue={vehicle?.transmission ?? ''} className={inputClass} />
          </Field>
          <Field label={t.fuelTypeLabel}>
            <input name="fuelType" placeholder={t.fuelTypePlaceholder} maxLength={40} defaultValue={vehicle?.fuelType ?? ''} className={inputClass} />
          </Field>
          <Field label={t.vinLabel}>
            <input name="vin" maxLength={17} defaultValue={vehicle?.vin ?? ''} className={`${inputClass} font-mono uppercase`} />
          </Field>
          <Field label={t.priceLabel}>
            <input name="price" type="number" min={0} step="0.01" defaultValue={vehicle?.price ?? ''} className={inputClass} />
          </Field>
          <Field label={t.currencyLabel}>
            <input name="currency" maxLength={3} defaultValue={vehicle?.currency ?? 'CAD'} className={`${inputClass} uppercase`} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t.sectionDescription} icon={ClipboardList}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.descriptionFrLabel}>
            <textarea name="descriptionFr" rows={4} maxLength={4000} defaultValue={vehicle?.descriptionFr ?? ''} className={inputClass} />
          </Field>
          <Field label={t.descriptionEnLabel}>
            <textarea name="descriptionEn" rows={4} maxLength={4000} defaultValue={vehicle?.descriptionEn ?? ''} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t.optionsFrLabel} — ${t.optionsHint}`}>
            <textarea name="optionsFr" rows={4} defaultValue={(vehicle?.optionsFr ?? []).join('\n')} className={inputClass} />
          </Field>
          <Field label={`${t.optionsEnLabel} — ${t.optionsHint}`}>
            <textarea name="optionsEn" rows={4} defaultValue={(vehicle?.optionsEn ?? []).join('\n')} className={inputClass} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t.sectionStatus} icon={Eye}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.statusLabel}>
            <select name="status" defaultValue={vehicle?.status ?? 'available'} className={inputClass}>
              {VEHICLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {dict.admin.inventoryPage.statuses[status]}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex h-[46px] cursor-pointer items-center gap-2 text-sm text-foreground select-none sm:mt-6">
            <input type="checkbox" name="isFeatured" defaultChecked={vehicle?.isFeatured ?? false} className="h-4 w-4 accent-accent" />
            {t.featuredLabel}
          </label>
        </div>
      </SectionCard>

      <StatusLine state={state} successMessage={t.saved} errorMap={errorMap} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push('/admin/vehicles')}
          disabled={pending}
          className={buttonClasses({ variant: 'secondary-muted', size: 'md', className: 'w-full justify-center sm:w-auto' })}
        >
          {t.cancel}
        </button>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'primary', size: 'md', className: 'w-full justify-center sm:w-auto' })}>
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  )
}

import type { ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { ContactFormState } from '@/src/components/vehicle-wizard/types'
import type { BudgetFormState, VehicleWantedFormState, WizardStep } from './types'

function ReviewSection({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string
  editLabel: string
  onEdit: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-accent hover:underline">
          {editLabel}
        </button>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function ReviewStep({
  dict,
  vehicle,
  budget,
  contact,
  submitting,
  submitError,
  onEdit,
  onSubmit,
}: {
  dict: Dictionary
  vehicle: VehicleWantedFormState
  budget: BudgetFormState
  contact: ContactFormState
  submitting: boolean
  submitError: string | null
  onEdit: (step: WizardStep) => void
  onSubmit: () => void
}) {
  const t = dict.vehicleRequestWizard.review
  const notSpecified = t.notSpecified

  const contactMethodLabels: Record<string, string> = {
    whatsapp: dict.contact.whatsapp.label,
    phone: dict.contact.phone.label,
    email: dict.contact.email.label,
  }

  const yearRange = [vehicle.yearFrom, vehicle.yearTo].filter(Boolean).join(' – ')
  const mileageRange = [vehicle.mileageMin, vehicle.mileageMax].filter(Boolean).join(' – ')
  const budgetRange = [budget.budgetMin, budget.budgetMax].filter(Boolean).join(' – ')

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>

      <ReviewSection title={t.vehicleSection} onEdit={() => onEdit('vehicle')} editLabel={t.edit}>
        <p className="font-medium">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || notSpecified}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[
            yearRange || null,
            vehicle.color || null,
            vehicle.engine || null,
            vehicle.transmission || null,
            mileageRange ? `${mileageRange} km` : null,
            vehicle.trimLevel || null,
          ]
            .filter(Boolean)
            .join(' · ') || notSpecified}
        </p>
      </ReviewSection>

      <ReviewSection title={t.budgetSection} onEdit={() => onEdit('budget')} editLabel={t.edit}>
        <p className="font-medium">{budgetRange ? `${budgetRange} ${budget.currency}` : notSpecified}</p>
        {budget.otherPreferences && <p className="mt-1 text-sm text-muted-foreground">{budget.otherPreferences}</p>}
      </ReviewSection>

      <ReviewSection title={t.contactSection} onEdit={() => onEdit('contact')} editLabel={t.edit}>
        <p className="font-medium">{contact.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {contact.phone}
          {contact.email ? ` · ${contact.email}` : ''}
        </p>
      </ReviewSection>

      <ReviewSection title={t.preferredSection} onEdit={() => onEdit('contact')} editLabel={t.edit}>
        <p className="font-medium">{contactMethodLabels[contact.preferredContact]}</p>
      </ReviewSection>

      {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? t.submitting : t.submit}
      </button>
    </div>
  )
}

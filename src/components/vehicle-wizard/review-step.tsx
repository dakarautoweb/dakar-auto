import type { ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { ConfirmedVehicle, ContactFormState, PartFormState, SelectedPhoto, WizardStep } from './types'

export function ReviewStep({
  dict,
  vehicle,
  part,
  photos,
  contact,
  submitting,
  submitError,
  onEdit,
  onSubmit,
}: {
  dict: Dictionary
  vehicle: ConfirmedVehicle
  part: PartFormState
  photos: SelectedPhoto[]
  contact: ContactFormState
  submitting: boolean
  submitError: string | null
  onEdit: (step: WizardStep) => void
  onSubmit: () => void
}) {
  const category = dict.categories.items.find((c) => c.key === part.category)
  const categoryLabel = category?.title ?? dict.categories.cantFind.title

  const conditionLabels: Record<string, string> = {
    oem: dict.wizard.partDetails.conditionOem,
    aftermarket: dict.wizard.partDetails.conditionAftermarket,
    used: dict.wizard.partDetails.conditionUsed,
    no_preference: dict.wizard.partDetails.conditionNoPreference,
  }
  const sideLabels: Record<string, string> = {
    left: dict.wizard.partDetails.sideLeft,
    right: dict.wizard.partDetails.sideRight,
    both: dict.wizard.partDetails.sideBoth,
  }
  const contactMethodLabels: Record<string, string> = {
    whatsapp: dict.contact.whatsapp.label,
    phone: dict.contact.phone.label,
    email: dict.contact.email.label,
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.review.title}</h2>

      <ReviewSection title={dict.wizard.review.vehicleSection} onEdit={() => onEdit('vehicle')} editLabel={dict.wizard.review.edit}>
        <p className="font-medium">{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}</p>
        {vehicle.vin && (
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">
            {dict.wizard.result.vinLabel}: {vehicle.vin}
          </p>
        )}
      </ReviewSection>

      <ReviewSection title={dict.wizard.review.partSection} onEdit={() => onEdit('parts')} editLabel={dict.wizard.review.edit}>
        <p className="font-medium">
          {categoryLabel} — {part.partName}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[
            part.side ? sideLabels[part.side] : null,
            conditionLabels[part.condition],
            `${dict.wizard.partDetails.quantityLabel}: ${part.quantity}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {part.description && <p className="mt-1 text-sm text-muted-foreground">{part.description}</p>}
      </ReviewSection>

      {photos.length > 0 && (
        <ReviewSection
          title={`${dict.wizard.review.photosSection} · ${dict.wizard.partDetails.photos.optional}`}
          onEdit={() => onEdit('parts')}
          editLabel={dict.wizard.review.edit}
        >
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.previewUrl}
                alt=""
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        </ReviewSection>
      )}

      <ReviewSection title={dict.wizard.review.contactSection} onEdit={() => onEdit('contact')} editLabel={dict.wizard.review.edit}>
        <p className="font-medium">{contact.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {contact.phone}
          {contact.email ? ` · ${contact.email}` : ''}
        </p>
      </ReviewSection>

      <ReviewSection
        title={dict.wizard.review.preferredSection}
        onEdit={() => onEdit('contact')}
        editLabel={dict.wizard.review.edit}
      >
        <p className="font-medium">{contactMethodLabels[contact.preferredContact]}</p>
      </ReviewSection>

      {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? dict.wizard.review.submitting : dict.wizard.review.submit}
      </button>
    </div>
  )
}

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

'use client'

import type { ComponentType, ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import {
  ArrowRightIcon,
  CalendarIcon,
  CubeIcon,
  EditIcon,
  IdCardIcon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  SettingsGearIcon,
  ShieldIcon,
  SideArrowsIcon,
  VINIcon,
  WhatsAppIcon,
} from '@/src/components/home/icons'
import type { ConfirmedVehicle, ContactFormState, PartFormState, SelectedPhoto, WizardStep } from './types'

const NOT_AVAILABLE = 'N/A'

const PREFERRED_CONTACT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  phone: PhoneIcon,
  email: MailIcon,
}

export function ReviewStep({
  dict,
  vehicle,
  part,
  photos,
  contact,
  submitting,
  uploadsInProgress,
  submitError,
  turnstileToken,
  turnstileWidget,
  onEdit,
  onSubmit,
}: {
  dict: Dictionary
  vehicle: ConfirmedVehicle
  part: PartFormState
  photos: SelectedPhoto[]
  contact: ContactFormState
  submitting: boolean
  uploadsInProgress: boolean
  submitError: string | null
  // Turnstile state/lifecycle lives in the wizard (it's the component that
  // actually knows about submit success/failure and needs to reset the
  // widget after a failed attempt) — this component just renders the
  // widget where it belongs and reads the current token for the disabled
  // check.
  turnstileToken: string
  turnstileWidget: ReactNode
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
  const PreferredIcon = PREFERRED_CONTACT_ICONS[contact.preferredContact] ?? MailIcon

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{dict.wizard.review.title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.review.description}</p>
      </div>

      <ReviewSection title={dict.wizard.review.vehicleSection} onEdit={() => onEdit('vehicle')} editLabel={dict.wizard.review.edit}>
        <p className="text-lg font-bold tracking-tight">{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}</p>
        <MetaRow
          items={[
            vehicle.vin ? { icon: <VINIcon className="h-4 w-4" />, text: `${dict.wizard.result.vinLabel} : ${vehicle.vin}` } : null,
            { icon: <CalendarIcon className="h-4 w-4" />, text: `${dict.wizard.manual.yearLabel} : ${vehicle.year ?? NOT_AVAILABLE}` },
            {
              icon: <IdCardIcon className="h-4 w-4" />,
              text: `${dict.wizard.review.identificationMethodLabel} : ${
                vehicle.source === 'manual' ? dict.wizard.review.identificationMethodManual : dict.wizard.review.identificationMethodVin
              }`,
            },
          ]}
        />
      </ReviewSection>

      <ReviewSection title={dict.wizard.review.partSection} onEdit={() => onEdit('parts')} editLabel={dict.wizard.review.edit}>
        <p className="text-lg font-bold tracking-tight">
          {categoryLabel} — {part.partName}
        </p>
        <MetaRow
          items={[
            { icon: <SettingsGearIcon className="h-4 w-4" />, text: `${dict.wizard.partDetails.conditionLabel} : ${conditionLabels[part.condition]}` },
            { icon: <CubeIcon className="h-4 w-4" />, text: `${dict.wizard.partDetails.quantityLabel} : ${part.quantity}` },
            { icon: <SideArrowsIcon className="h-4 w-4" />, text: `${dict.wizard.partDetails.sideLabel} : ${part.side ? sideLabels[part.side] : NOT_AVAILABLE}` },
          ]}
        />
        {part.description && <p className="mt-2 text-sm text-muted-foreground">{part.description}</p>}
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
        <p className="text-lg font-bold tracking-tight">{contact.name}</p>
        <MetaRow
          items={[
            { icon: <PhoneIcon className="h-4 w-4" />, text: contact.phone },
            contact.email ? { icon: <MailIcon className="h-4 w-4" />, text: contact.email } : null,
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title={dict.wizard.review.preferredSection}
        onEdit={() => onEdit('contact')}
        editLabel={dict.wizard.review.edit}
      >
        <p className="text-lg font-bold tracking-tight">{contactMethodLabels[contact.preferredContact]}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <PreferredIcon className="h-4 w-4 shrink-0 text-accent" />
          {dict.wizard.review.preferredNote}
        </p>
      </ReviewSection>

      <div className={cardClasses({ padding: 'sm' })}>{turnstileWidget}</div>

      {uploadsInProgress && <p className="text-sm text-muted-foreground">{dict.wizard.review.uploadsInProgress}</p>}
      {submitError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onEdit('contact')} className={buttonClasses({ variant: 'secondary-muted' })}>
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
            {dict.wizard.common.back}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || uploadsInProgress || !turnstileToken}
            className={buttonClasses({ variant: 'primary' })}
          >
            {submitting ? (
              dict.wizard.review.submitting
            ) : (
              <>
                <SendIcon className="h-4 w-4" />
                {dict.wizard.review.submit}
              </>
            )}
          </button>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground sm:max-w-[16rem] sm:text-right">
          <ShieldIcon className="h-5 w-5 shrink-0 text-accent" />
          {dict.wizard.review.securityNote}
        </p>
      </div>
    </div>
  )
}

function MetaRow({ items }: { items: ({ icon: ReactNode; text: string } | null)[] }) {
  const entries = items.filter((item): item is { icon: ReactNode; text: string } => Boolean(item))
  if (entries.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {entries.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-3">
          {i > 0 && <span className="h-3.5 w-px bg-border" aria-hidden="true" />}
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="text-accent">{item.icon}</span>
            {item.text}
          </span>
        </span>
      ))}
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
    <div className={cardClasses({ padding: 'sm' })}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-accent transition duration-200 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <EditIcon className="h-3.5 w-3.5" />
          {editLabel}
        </button>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

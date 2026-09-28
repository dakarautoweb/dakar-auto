import type { ComponentType, ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { ContactFormState } from '@/src/components/vehicle-wizard/types'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import {
  CalendarIcon,
  EditIcon,
  EngineIcon,
  GaugeIcon,
  MailIcon,
  PaletteIcon,
  PhoneIcon,
  PriceTagIcon,
  TransmissionSpecIcon,
  WhatsAppIcon,
} from '@/src/components/home/icons'
import type { BudgetFormState, VehicleWantedFormState, WizardStep } from './types'

const PREFERRED_CONTACT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  phone: PhoneIcon,
  email: MailIcon,
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

function MetaRow({ items }: { items: ({ icon?: ReactNode; text: string } | null)[] }) {
  const entries = items.filter((item): item is { icon?: ReactNode; text: string } => Boolean(item))
  if (entries.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {entries.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-3">
          {i > 0 && <span className="h-3.5 w-px bg-border" aria-hidden="true" />}
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {item.icon && <span className="text-accent">{item.icon}</span>}
            {item.text}
          </span>
        </span>
      ))}
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
  turnstileToken,
  turnstileWidget,
  onEdit,
  onSubmit,
}: {
  dict: Dictionary
  vehicle: VehicleWantedFormState
  budget: BudgetFormState
  contact: ContactFormState
  submitting: boolean
  submitError: string | null
  // Turnstile state/lifecycle lives in the wizard — see the parts-request
  // ReviewStep for the same pattern and why.
  turnstileToken: string
  turnstileWidget: ReactNode
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
  const PreferredIcon = PREFERRED_CONTACT_ICONS[contact.preferredContact] ?? MailIcon

  const yearRange = [vehicle.yearFrom, vehicle.yearTo].filter(Boolean).join(' – ')
  const mileageRange = [vehicle.mileageMin, vehicle.mileageMax].filter(Boolean).join(' – ')
  const budgetRange = [budget.budgetMin, budget.budgetMax].filter(Boolean).join(' – ')

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>

      <ReviewSection title={t.vehicleSection} onEdit={() => onEdit('vehicle')} editLabel={t.edit}>
        <p className="font-medium">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || notSpecified}</p>
        <MetaRow
          items={[
            yearRange ? { icon: <CalendarIcon className="h-4 w-4" />, text: yearRange } : null,
            vehicle.color ? { icon: <PaletteIcon className="h-4 w-4" />, text: vehicle.color } : null,
            vehicle.engine ? { icon: <EngineIcon className="h-4 w-4" />, text: vehicle.engine } : null,
            vehicle.transmission ? { icon: <TransmissionSpecIcon className="h-4 w-4" />, text: vehicle.transmission } : null,
            mileageRange ? { icon: <GaugeIcon className="h-4 w-4" />, text: `${mileageRange} km` } : null,
            vehicle.trimLevel ? { text: vehicle.trimLevel } : null,
          ]}
        />
      </ReviewSection>

      <ReviewSection title={t.budgetSection} onEdit={() => onEdit('budget')} editLabel={t.edit}>
        <p className="flex items-center gap-1.5 font-medium">
          <PriceTagIcon className="h-4 w-4 shrink-0 text-accent" />
          {budgetRange ? `${budgetRange} ${budget.currency}` : notSpecified}
        </p>
        {budget.otherPreferences && <p className="mt-1 text-sm text-muted-foreground">{budget.otherPreferences}</p>}
      </ReviewSection>

      <ReviewSection title={t.contactSection} onEdit={() => onEdit('contact')} editLabel={t.edit}>
        <p className="font-medium">{contact.name}</p>
        <MetaRow
          items={[
            { icon: <PhoneIcon className="h-4 w-4" />, text: contact.phone },
            contact.email ? { icon: <MailIcon className="h-4 w-4" />, text: contact.email } : null,
          ]}
        />
      </ReviewSection>

      <ReviewSection title={t.preferredSection} onEdit={() => onEdit('contact')} editLabel={t.edit}>
        <p className="flex items-center gap-1.5 font-medium">
          <PreferredIcon className="h-4 w-4 shrink-0 text-accent" />
          {contactMethodLabels[contact.preferredContact]}
        </p>
      </ReviewSection>

      <div className={cardClasses({ padding: 'sm' })}>{turnstileWidget}</div>

      {submitError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !turnstileToken}
        className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, className: 'sm:w-auto' })}
      >
        {submitting ? t.submitting : t.submit}
      </button>
    </div>
  )
}

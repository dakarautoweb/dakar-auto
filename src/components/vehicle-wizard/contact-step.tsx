'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PreferredContact } from '@/src/services/requests/types'
import { isValidWhatsAppRecipient, resolveWhatsAppInput } from '@/src/services/whatsapp/phone'
import { isValidEmail, normalizeContactValues, normalizeEmail } from '@/src/lib/contact-validation'
import { buttonClasses, cardClasses, inputClass } from '@/src/components/ui/styles'
import { ArrowRightIcon, CheckIcon, MailIcon, PersonIcon, PhoneIcon, WhatsAppIcon } from '@/src/components/home/icons'
import type { ContactFormState } from './types'

type ContactErrors = { email?: string; whatsapp?: string }

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}

// Icon-prefixed text input — one consistent recipe for every field on this
// screen, instead of a bare inputClass.
function IconInput({ icon, id, ...props }: { icon: ReactNode; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input id={id} {...props} className={`${inputClass} pl-11`} />
    </div>
  )
}

const CONTACT_METHODS: {
  value: PreferredContact
  Icon: ComponentType<{ className?: string }>
  activeClass: string
  idleIconClass: string
}[] = [
  { value: 'whatsapp', Icon: WhatsAppIcon, activeClass: 'border-transparent bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25', idleIconClass: 'text-[#25D366]' },
  { value: 'phone', Icon: PhoneIcon, activeClass: 'border-transparent bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/25', idleIconClass: 'text-[#3B82F6]' },
  { value: 'email', Icon: MailIcon, activeClass: 'border-transparent bg-accent text-accent-foreground shadow-glow', idleIconClass: 'text-accent' },
]

export function ContactStep({
  dict,
  initialValue,
  onBack,
  onContinue,
}: {
  dict: Dictionary
  initialValue?: ContactFormState | null
  onBack: () => void
  onContinue: (contact: ContactFormState) => void
}) {
  const [name, setName] = useState(initialValue?.name ?? '')
  const [email, setEmail] = useState(initialValue?.email ?? '')
  const [phone, setPhone] = useState(initialValue?.phone ?? '')
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(initialValue?.whatsappSameAsPhone ?? true)
  const [whatsappPhone, setWhatsappPhone] = useState(initialValue?.whatsappPhone ?? '')
  const [preferredContact, setPreferredContact] = useState<PreferredContact>(
    initialValue?.preferredContact ?? 'whatsapp'
  )

  // Shown once a field has been left or a submit attempted — not while the
  // customer is still typing their first characters.
  const [touched, setTouched] = useState<{ phone?: boolean; email?: boolean; whatsapp?: boolean }>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const isValid = name.trim().length > 0 && phone.trim().length > 0

  // The customer confirmation is only sent on the chosen channel (never
  // falls back to another one), so that channel has to be usable: WhatsApp
  // needs an international number (Meta can't reach a local one without a
  // country code), email needs an address. An email typed in while another
  // method is chosen must still be well-formed — the server rejects it.
  const whatsappInput = resolveWhatsAppInput({ phone, whatsappSameAsPhone, whatsappPhone })
  const errors: ContactErrors = {}
  const trimmedEmail = normalizeEmail(email)
  if (preferredContact === 'email' && !trimmedEmail) errors.email = dict.wizard.contact.errors.emailRequired
  else if (trimmedEmail && !isValidEmail(trimmedEmail)) errors.email = dict.wizard.contact.errors.emailInvalid
  if (preferredContact === 'whatsapp') {
    if (!whatsappInput) errors.whatsapp = dict.wizard.contact.errors.whatsappRequired
    else if (!isValidWhatsAppRecipient(whatsappInput)) errors.whatsapp = dict.wizard.contact.errors.whatsappInvalid
  }

  // With "same as phone" checked, a WhatsApp problem is a problem with the
  // phone field itself, so the message is shown there.
  const whatsappTouched = whatsappSameAsPhone ? touched.phone : touched.whatsapp
  const visibleErrors: ContactErrors = {
    email: submitAttempted || touched.email ? errors.email : undefined,
    whatsapp: submitAttempted || whatsappTouched ? errors.whatsapp : undefined,
  }
  const phoneError = whatsappSameAsPhone ? visibleErrors.whatsapp : undefined
  const whatsappFieldError = whatsappSameAsPhone ? undefined : visibleErrors.whatsapp

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isValid) return
    if (errors.email || errors.whatsapp) {
      setSubmitAttempted(true)
      const target = errors.whatsapp ? (whatsappSameAsPhone ? 'contact-phone' : 'contact-whatsapp') : 'contact-email'
      document.getElementById(target)?.focus()
      return
    }
    onContinue(normalizeContactValues({
      name: name.trim(),
      email,
      phone,
      whatsappSameAsPhone,
      whatsappPhone,
      preferredContact,
    }))
  }

  const contactOptions: { value: PreferredContact; label: string }[] = [
    { value: 'whatsapp', label: dict.contact.whatsapp.label },
    { value: 'phone', label: dict.contact.phone.label },
    { value: 'email', label: dict.contact.email.label },
  ]

  return (
    <form onSubmit={handleSubmit} className={cardClasses()}>
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <span className="h-9 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">{dict.wizard.contact.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{dict.wizard.contact.description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.contact.nameLabel}
          </label>
          <IconInput
            id="contact-name"
            icon={<PersonIcon className="h-[18px] w-[18px]" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict.wizard.contact.namePlaceholder}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {dict.wizard.contact.phoneLabel}
            </label>
            <IconInput
              id="contact-phone"
              type="tel"
              icon={<PhoneIcon className="h-[18px] w-[18px]" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder={dict.wizard.contact.phonePlaceholder}
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? 'contact-phone-error' : undefined}
            />
            <FieldError id="contact-phone-error" message={phoneError} />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {dict.wizard.contact.emailLabel}
            </label>
            <IconInput
              id="contact-email"
              type="email"
              icon={<MailIcon className="h-[18px] w-[18px]" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder={dict.wizard.contact.emailPlaceholder}
              aria-invalid={visibleErrors.email ? true : undefined}
              aria-describedby={visibleErrors.email ? 'contact-email-error' : undefined}
            />
            <FieldError id="contact-email-error" message={visibleErrors.email} />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium select-none">
          <span className="relative">
            <input
              type="checkbox"
              checked={whatsappSameAsPhone}
              onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
              className="peer sr-only"
            />
            <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-border bg-surface text-transparent transition duration-200 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          </span>
          {dict.wizard.contact.whatsappSameLabel}
        </label>

        {!whatsappSameAsPhone && (
          <div>
            <label htmlFor="contact-whatsapp" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {dict.wizard.contact.whatsappLabel}
            </label>
            <IconInput
              id="contact-whatsapp"
              type="tel"
              icon={<WhatsAppIcon className="h-[18px] w-[18px]" />}
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, whatsapp: true }))}
              placeholder={dict.wizard.contact.whatsappPlaceholder}
              aria-invalid={whatsappFieldError ? true : undefined}
              aria-describedby={whatsappFieldError ? 'contact-whatsapp-error' : undefined}
            />
            <FieldError id="contact-whatsapp-error" message={whatsappFieldError} />
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{dict.wizard.contact.preferredLabel}</span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {contactOptions.map((opt) => {
              const method = CONTACT_METHODS.find((m) => m.value === opt.value)!
              const active = preferredContact === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPreferredContact(opt.value)}
                  aria-pressed={active}
                  className={`flex h-14 items-center justify-center gap-2.5 rounded-2xl border text-sm font-semibold transition duration-200 ${
                    active ? method.activeClass : 'border-border bg-surface text-foreground hover:border-accent-hover'
                  }`}
                >
                  <method.Icon className={`h-5 w-5 ${active ? 'text-current' : method.idleIconClass}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          {preferredContact === 'whatsapp' && (
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{dict.wizard.contact.whatsappConsent}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <button type="submit" disabled={!isValid} className={buttonClasses({ variant: 'primary' })}>
          {dict.wizard.contact.continue}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={onBack} className={buttonClasses({ variant: 'secondary-muted' })}>
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
          {dict.wizard.common.back}
        </button>
      </div>
    </form>
  )
}

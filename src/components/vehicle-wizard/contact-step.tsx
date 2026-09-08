'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PreferredContact } from '@/src/services/requests/types'
import type { ContactFormState } from './types'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

const pillClass = (active: boolean) =>
  `rounded-lg border px-4 py-2 text-sm font-medium transition ${
    active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
  }`

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

  const isValid = name.trim().length > 0 && phone.trim().length > 0

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isValid) return
    onContinue({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      whatsappSameAsPhone,
      whatsappPhone: whatsappPhone.trim(),
      preferredContact,
    })
  }

  const contactOptions: { value: PreferredContact; label: string }[] = [
    { value: 'whatsapp', label: dict.contact.whatsapp.label },
    { value: 'phone', label: dict.contact.phone.label },
    { value: 'email', label: dict.contact.email.label },
  ]

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.contact.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.contact.description}</p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.contact.nameLabel}
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict.wizard.contact.namePlaceholder}
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {dict.wizard.contact.phoneLabel}
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={dict.wizard.contact.phonePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {dict.wizard.contact.emailLabel}
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.wizard.contact.emailPlaceholder}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            checked={whatsappSameAsPhone}
            onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          {dict.wizard.contact.whatsappSameLabel}
        </label>

        {!whatsappSameAsPhone && (
          <div>
            <label htmlFor="contact-whatsapp" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {dict.wizard.contact.whatsappLabel}
            </label>
            <input
              id="contact-whatsapp"
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder={dict.wizard.contact.whatsappPlaceholder}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{dict.wizard.contact.preferredLabel}</span>
          <div className="flex flex-wrap gap-2">
            {contactOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreferredContact(opt.value)}
                aria-pressed={preferredContact === opt.value}
                className={pillClass(preferredContact === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!isValid}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dict.wizard.contact.continue}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
        >
          {dict.wizard.common.back}
        </button>
      </div>
    </form>
  )
}

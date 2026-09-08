'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { WhatsAppIcon, PhoneIcon, MailIcon } from '@/src/components/home/icons'

function toWhatsAppDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

const buttonClass =
  'inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:border-accent hover:text-accent'

export function ContactActions({
  dict,
  phone,
  whatsappPhone,
  email,
}: {
  dict: Dictionary
  phone: string
  whatsappPhone: string | null
  email: string | null
}) {
  const [copied, setCopied] = useState<'phone' | 'email' | null>(null)
  const t = dict.admin.detail.actions

  async function copy(kind: 'phone' | 'email', value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard access can be denied by the browser — silently ignore,
      // the action buttons (call/email/whatsapp) still work regardless.
    }
  }

  const waNumber = toWhatsAppDigits(whatsappPhone || phone)

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className={buttonClass}>
        <WhatsAppIcon className="h-4 w-4" />
        {t.whatsapp}
      </a>
      <a href={`tel:${phone}`} className={buttonClass}>
        <PhoneIcon className="h-4 w-4" />
        {t.call}
      </a>
      {email && (
        <a href={`mailto:${email}`} className={buttonClass}>
          <MailIcon className="h-4 w-4" />
          {t.email}
        </a>
      )}
      <button type="button" onClick={() => copy('phone', phone)} className={buttonClass}>
        {copied === 'phone' ? t.copied : t.copyPhone}
      </button>
      {email && (
        <button type="button" onClick={() => copy('email', email)} className={buttonClass}>
          {copied === 'email' ? t.copied : t.copyEmail}
        </button>
      )}
    </div>
  )
}

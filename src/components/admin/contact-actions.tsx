'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { WhatsAppIcon, PhoneIcon, MailIcon } from '@/src/components/home/icons'
import { buttonClasses } from '@/src/components/ui/styles'

function toWhatsAppDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

// Mobile: a 2-column grid of full-width 44px-tall buttons (size 'md'), so
// every action is the same height and actually fills the row instead of
// wrap-shrinking into ragged stubs. From sm up the `sm:*` overrides restore
// the original single flex row of `h-10 px-4 flex-1` buttons exactly —
// media-variant utilities always cascade after the base ones, so this is a
// safe way to re-pin the height without two bare conflicting `h-*` classes.
const actionClass = buttonClasses({
  variant: 'secondary-muted',
  size: 'md',
  // px-3/13px on mobile keeps the longest label ("Copy phone") on one line
  // inside half of a 320px card; sm+ restores the original px-4/text-sm.
  className: 'w-full gap-1.5 px-3 text-[13px] whitespace-nowrap sm:h-10 sm:w-auto sm:flex-1 sm:gap-2 sm:px-4 sm:text-sm',
})

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
    // The action count is always odd (3 without an email, 5 with one), so
    // the last cell would otherwise sit alone at half width — span it.
    // `grid-column` is inert on a flex child, so this needs no sm: reset.
    <div className="grid grid-cols-2 gap-2 [&>*:last-child]:col-span-2 sm:flex sm:flex-nowrap">
      <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className={actionClass}>
        <WhatsAppIcon className="h-[18px] w-[18px]" />
        {t.whatsapp}
      </a>
      <a href={`tel:${phone}`} className={actionClass}>
        <PhoneIcon className="h-[18px] w-[18px]" />
        {t.call}
      </a>
      {email && (
        <a href={`mailto:${email}`} className={actionClass}>
          <MailIcon className="h-[18px] w-[18px]" />
          {t.email}
        </a>
      )}
      <button type="button" onClick={() => copy('phone', phone)} className={actionClass}>
        {copied === 'phone' ? <Check className="h-[18px] w-[18px]" strokeWidth={2} /> : <Copy className="h-[18px] w-[18px]" strokeWidth={2} />}
        {copied === 'phone' ? t.copied : t.copyPhone}
      </button>
      {email && (
        <button type="button" onClick={() => copy('email', email)} className={actionClass}>
          {copied === 'email' ? <Check className="h-[18px] w-[18px]" strokeWidth={2} /> : <Copy className="h-[18px] w-[18px]" strokeWidth={2} />}
          {copied === 'email' ? t.copied : t.copyEmail}
        </button>
      )}
    </div>
  )
}

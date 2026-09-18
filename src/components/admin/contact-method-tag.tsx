import type { Dictionary } from '@/src/i18n/dictionaries'
import { WhatsAppIcon, PhoneIcon, MailIcon } from '@/src/components/home/icons'

// CONTACT column tag — icon + short label, colored per channel (WhatsApp
// green, Email gold/neutral, Phone blue) as specified. Distinct from
// ContactActions (contact-actions.tsx), which renders full clickable
// call/email/WhatsApp/copy buttons on the request detail page — this is a
// compact, non-interactive read of which channel the customer prefers, for
// a dense table cell.
const METHOD_STYLES: Record<string, { icon: typeof WhatsAppIcon; className: string }> = {
  whatsapp: { icon: WhatsAppIcon, className: 'text-emerald-600 dark:text-emerald-400' },
  email: { icon: MailIcon, className: 'text-accent-gold' },
  phone: { icon: PhoneIcon, className: 'text-blue-600 dark:text-blue-400' },
}

export function contactMethodLabel(dict: Dictionary, method: string): string {
  const map = dict.admin.contactColumn as Record<string, string>
  return map[method] ?? method
}

export function ContactMethodTag({ dict, method }: { dict: Dictionary; method: string }) {
  const style = METHOD_STYLES[method]
  if (!style) return <span className="text-muted-foreground">{dict.admin.contactColumn.none}</span>

  const Icon = style.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.className}`}>
      <Icon className="h-4 w-4 shrink-0" />
      {contactMethodLabel(dict, method)}
    </span>
  )
}

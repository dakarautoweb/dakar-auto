import type { Dictionary } from '@/src/i18n/dictionaries'
import { SectionHeading } from './section-heading'
import { MailIcon, PhoneIcon, WhatsAppIcon } from './icons'

// Placeholder contact details — replace with Dakar Auto's real WhatsApp
// number, email, and phone line before launch.
const WHATSAPP_LINK = 'https://wa.me/221000000000'
const EMAIL_ADDRESS = 'contact@dakarauto.com'
const PHONE_NUMBER = '+22100000000'

export function ContactSection({ dict }: { dict: Dictionary }) {
  return (
    <section id="contact" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title={dict.contact.title} description={dict.contact.description} center />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center transition hover:border-accent hover:shadow-md"
          >
            <WhatsAppIcon className="h-8 w-8 text-accent" />
            <span className="font-semibold">{dict.contact.whatsapp.label}</span>
            <span className="text-sm text-muted-foreground">{dict.contact.whatsapp.value}</span>
          </a>
          <a
            href={`mailto:${EMAIL_ADDRESS}`}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center transition hover:border-accent hover:shadow-md"
          >
            <MailIcon className="h-8 w-8 text-accent" />
            <span className="font-semibold">{dict.contact.email.label}</span>
            <span className="text-sm text-muted-foreground">{dict.contact.email.value}</span>
          </a>
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center transition hover:border-accent hover:shadow-md"
          >
            <PhoneIcon className="h-8 w-8 text-accent" />
            <span className="font-semibold">{dict.contact.phone.label}</span>
            <span className="text-sm text-muted-foreground">{dict.contact.phone.value}</span>
          </a>
        </div>
      </div>
    </section>
  )
}

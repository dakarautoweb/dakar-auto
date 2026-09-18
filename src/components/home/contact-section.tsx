import type { ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { normalizePhoneDigits, buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import type { PublicSiteSettings } from '@/src/services/site-settings/types'
import { cardClasses } from '@/src/components/ui/styles'
import { SectionHeading } from './section-heading'
import { MailIcon, PhoneIcon, WhatsAppIcon, InstagramIcon, FacebookIcon } from './icons'

// No size change on hover at all (no scale, no lift, no rotation) — the
// card stays perfectly stable. The normal card border (from cardClasses)
// stays visible as-is; the hover effect is a second layer on top.
const contactCardClass = cardClasses({
  padding: 'sm',
  className: 'group relative flex flex-col items-center gap-3 text-center',
})

// Channel-coded colors — a restrained, desaturated version of each
// channel's familiar color rather than the shared orange accent for all of
// them, so the row reads at a glance instead of looking identical.
const CHANNEL_TONES = {
  whatsapp: { icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', ring: '#10b981', glow: 'group-hover:shadow-[0_0_22px_6px_rgba(16,185,129,0.45)]' },
  email: { icon: 'bg-accent-gold-soft text-accent-gold', ring: '#d9a441', glow: 'group-hover:shadow-glow-gold' },
  phone: { icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', ring: '#3b82f6', glow: 'group-hover:shadow-[0_0_22px_6px_rgba(59,130,246,0.45)]' },
  instagram: { icon: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', ring: '#ec4899', glow: 'group-hover:shadow-[0_0_22px_6px_rgba(236,72,153,0.45)]' },
  facebook: { icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', ring: '#6366f1', glow: 'group-hover:shadow-[0_0_22px_6px_rgba(99,102,241,0.45)]' },
  address: { icon: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', ring: '#f97316', glow: 'group-hover:shadow-[0_0_22px_6px_rgba(249,115,22,0.45)]' },
} satisfies Record<string, { icon: string; ring: string; glow: string }>

// A real traced rounded-rect path (not a conic-gradient mask, which visibly
// skews on a non-square box) — a short bright dash with rounded caps and a
// soft blur, animated by decreasing `stroke-dashoffset` so it travels
// forward along the path direction. An SVG `<rect>`'s implicit path always
// runs top edge left→right, right edge top→bottom, bottom edge right→left,
// left edge bottom→top — i.e. clockwise — so this is inherently clockwise
// motion that hugs the actual rounded corners exactly, with no separate
// outline element that can float off the card's shape. `pathLength="100"`
// makes the dash length/offset percentages of the perimeter regardless of
// the card's real pixel size, so one component works for every card.
function BorderTracer({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="15"
        ry="15"
        pathLength={100}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="14 86"
        className="drop-shadow-[0_0_5px_currentColor] group-hover:[animation:contact-border-tracer_2.4s_linear_infinite]"
        style={{ color }}
      />
    </svg>
  )
}

function ContactCard({ tone, icon, label, value, href, external }: { tone: keyof typeof CHANNEL_TONES; icon: ReactNode; label: string; value: string; href: string; external?: boolean }) {
  const t = CHANNEL_TONES[tone]
  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={contactCardClass}>
      <BorderTracer color={t.ring} />
      <span className={`flex h-14 w-14 items-center justify-center rounded-full transition-shadow duration-300 ${t.icon} ${t.glow}`}>{icon}</span>
      <span className="font-semibold">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </a>
  )
}

// `settings` comes from the admin-editable public.site_settings row
// (Admin -> Paramètres -> "Informations de l'entreprise") — each field is
// already null unless its own "Afficher sur le site" toggle is on (see
// get_public_site_settings() in the migration), so building this list off
// plain truthiness is enough; no separate show/hide logic to duplicate
// here.
export function ContactSection({ dict, settings }: { dict: Dictionary; settings: PublicSiteSettings }) {
  const cards: Array<{ key: string; tone: keyof typeof CHANNEL_TONES; icon: ReactNode; label: string; value: string; href: string; external?: boolean }> = []

  if (settings.whatsapp) {
    cards.push({
      key: 'whatsapp',
      tone: 'whatsapp',
      icon: <WhatsAppIcon className="h-7 w-7" />,
      label: dict.contact.whatsapp.label,
      value: dict.contact.whatsapp.value,
      href: buildWhatsAppLinkFrom(settings.whatsapp),
      external: true,
    })
  }
  if (settings.email) {
    cards.push({ key: 'email', tone: 'email', icon: <MailIcon className="h-7 w-7" />, label: dict.contact.email.label, value: settings.email, href: `mailto:${settings.email}` })
  }
  if (settings.phone) {
    cards.push({
      key: 'phone',
      tone: 'phone',
      icon: <PhoneIcon className="h-7 w-7" />,
      label: dict.contact.phone.label,
      value: settings.phone,
      href: `tel:${normalizePhoneDigits(settings.phone)}`,
    })
  }
  if (settings.instagramUrl) {
    cards.push({
      key: 'instagram',
      tone: 'instagram',
      icon: <InstagramIcon className="h-7 w-7" />,
      label: dict.contact.instagram.label,
      value: dict.contact.instagram.value,
      href: settings.instagramUrl,
      external: true,
    })
  }
  if (settings.facebookUrl) {
    cards.push({
      key: 'facebook',
      tone: 'facebook',
      icon: <FacebookIcon className="h-7 w-7" />,
      label: dict.contact.facebook.label,
      value: dict.contact.facebook.value,
      href: settings.facebookUrl,
      external: true,
    })
  }

  // Contact section shows at most 3 cards, taken in the priority order
  // built above (WhatsApp > Email > Phone > Instagram > Facebook) — any
  // remaining enabled channels beyond the first 3 still appear in the
  // footer and elsewhere, which read straight off site settings and don't
  // go through this cap.
  const visibleCards = cards.slice(0, 3)

  if (visibleCards.length === 0) return null

  return (
    <section id="contact" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={dict.header.nav.contact} title={dict.contact.title} description={dict.contact.description} center />
        {/* flex-wrap + justify-center (not CSS grid) is what keeps an
            incomplete last row centered — grid's implicit tracks always
            left-align a short final row (e.g. 1 or 2 cards left in columns
            1-2 of a 3-column grid), which is exactly the "stuck to the
            left" look this replaces. Each card's width below reproduces
            the same 1/2/3-per-row breakpoints the old grid used, so the
            visual sizing is unchanged — only the centering behavior is
            new. */}
        <div className="mt-10 flex flex-wrap justify-center gap-5">
          {visibleCards.map((card) => (
            <div key={card.key} className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc((100%-2.5rem)/3)]">
              <ContactCard tone={card.tone} icon={card.icon} label={card.label} value={card.value} href={card.href} external={card.external} />
            </div>
          ))}
        </div>
        {settings.address && <p className="mt-6 text-center text-sm text-muted-foreground">{settings.address}</p>}
      </div>
    </section>
  )
}

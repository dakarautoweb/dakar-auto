import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { SITE_NAME, normalizePhoneDigits, buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import type { PublicSiteSettings } from '@/src/services/site-settings/types'
import { MailIcon, PhoneIcon, WhatsAppIcon, InstagramIcon, FacebookIcon } from '@/src/components/home/icons'

// Permanently dark, like the header/brand-wall (see globals.css --header-*
// tokens) — the approved footer reference is a rich dark panel in both
// themes, not a theme-reactive surface.
//
// `settings` comes from the admin-editable public.site_settings row
// (Admin -> Paramètres -> "Informations de l'entreprise") — every field
// here is already null unless that field's own "Afficher sur le site"
// toggle is on (see get_public_site_settings() in the migration), so this
// component can render conditionally straight off truthiness with no
// separate show/hide logic of its own to get wrong.
//
// Phones get their own compact order (sm+ keeps the original 2/4-column
// grid): brand full width, then Navigation and Légal side by side, then
// Contact full width with the social icons right under it, then the
// copyright row — which leaves room on the right for the floating chat
// launcher. The decorations are smaller/fainter there so they stay behind
// the content.
const sectionTitleClass = 'text-xs font-semibold tracking-[0.2em] text-header-muted uppercase sm:text-sm'
const linkListClass = 'mt-3 space-y-2.5 text-[0.95rem] sm:mt-4 sm:space-y-3'
const contactItemClass = 'flex items-start gap-2.5'
const contactIconClass = 'mt-[3px] h-[18px] w-[18px] shrink-0 text-accent'

export function SiteFooter({ dict, settings }: { dict: Dictionary; settings: PublicSiteSettings }) {
  const hasContactRow = settings.email || settings.phone || settings.whatsapp || settings.address
  const hasSocialRow = settings.instagramUrl || settings.facebookUrl
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-header-bg text-header-foreground">
      {/* Subtle orange top-edge glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent/10 to-transparent" />

      {/* Decorative mechanical line-art — bottom right, very subtle */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -right-14 -bottom-14 h-56 w-56 text-white/[0.05] sm:-right-16 sm:-bottom-16 sm:h-96 sm:w-96 sm:text-white/[0.07]"
      >
        <circle cx="260" cy="260" r="130" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="260" cy="260" r="95" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 10" />
        <circle cx="260" cy="260" r="60" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="260" cy="260" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {Array.from({ length: 12 }, (_, i) => {
          const deg = i * 30
          return <line key={deg} x1={260} y1={130} x2={260} y2={148} stroke="currentColor" strokeWidth="1.5" transform={`rotate(${deg} 260 260)`} />
        })}
      </svg>

      {/* Thin orange diagonal accent cutting the bottom-left corner */}
      <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute bottom-0 left-0 h-14 w-14 text-accent/30 sm:h-40 sm:w-40 sm:text-accent/40">
        <line x1="0" y1="150" x2="150" y2="0" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="120" x2="120" y2="0" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-10 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-2xl font-extrabold tracking-tight">
              DAKAR <span className="text-accent">AUTO</span>
            </p>
            <p className="mt-2 max-w-xs text-[0.95rem] text-header-muted sm:mt-3">{dict.footer.tagline}</p>
          </div>

          <div>
            <h3 className={sectionTitleClass}>{dict.footer.navTitle}</h3>
            <ul className={linkListClass}>
              <li>
                <Link href="/" className="transition duration-200 hover:text-accent">
                  {dict.header.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/parts" className="transition duration-200 hover:text-accent">
                  {dict.header.nav.parts}
                </Link>
              </li>
              <li>
                <Link href="/vehicles" className="transition duration-200 hover:text-accent">
                  {dict.header.nav.inventory}
                </Link>
              </li>
              <li>
                <Link href="/source-a-vehicle" className="transition duration-200 hover:text-accent">
                  {dict.header.nav.sourceVehicle}
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="transition duration-200 hover:text-accent">
                  {dict.header.nav.contact}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition duration-200 hover:text-accent">
                  {dict.header.nav.faq}
                </Link>
              </li>
            </ul>
          </div>

          {hasContactRow && (
            <div className="order-last col-span-2 sm:order-none sm:col-span-1">
              <h3 className={sectionTitleClass}>{dict.footer.contactTitle}</h3>
              <ul className="mt-3 space-y-2.5 text-[0.95rem] text-header-muted sm:mt-4 sm:space-y-3.5">
                {settings.email && (
                  <li className={contactItemClass}>
                    <MailIcon className={contactIconClass} />
                    <a href={`mailto:${settings.email}`} className="min-w-0 transition duration-200 [overflow-wrap:anywhere] hover:text-accent">
                      {settings.email}
                    </a>
                  </li>
                )}
                {settings.phone && (
                  <li className={contactItemClass}>
                    <PhoneIcon className={contactIconClass} />
                    <a href={`tel:${normalizePhoneDigits(settings.phone)}`} className="transition duration-200 hover:text-accent">
                      {settings.phone}
                    </a>
                  </li>
                )}
                {settings.whatsapp && (
                  <li className={contactItemClass}>
                    <WhatsAppIcon className={contactIconClass} />
                    <a
                      href={buildWhatsAppLinkFrom(settings.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition duration-200 hover:text-accent"
                    >
                      {settings.whatsapp}
                    </a>
                  </li>
                )}
                {settings.address && (
                  <li className={contactItemClass}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={contactIconClass}>
                      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="9.5" r="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="min-w-0">{settings.address}</span>
                  </li>
                )}
              </ul>
              {hasSocialRow && (
                <div className="mt-3 flex items-center gap-3 sm:mt-4">
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 sm:h-9 sm:w-9 text-header-muted transition duration-200 hover:border-accent hover:text-accent"
                    >
                      <InstagramIcon className="h-[18px] w-[18px]" />
                    </a>
                  )}
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 sm:h-9 sm:w-9 text-header-muted transition duration-200 hover:border-accent hover:text-accent"
                    >
                      <FacebookIcon className="h-[18px] w-[18px]" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className={sectionTitleClass}>{dict.footer.legalTitle}</h3>
            <ul className={linkListClass}>
              <li>
                <Link href="/privacy" className="transition duration-200 hover:text-accent">
                  {dict.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition duration-200 hover:text-accent">
                  {dict.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* pr-16 below sm: keeps the text clear of the fixed chat launcher. */}
        <div className="relative mt-8 border-t border-white/10 pt-5 pr-16 text-sm text-header-muted sm:mt-12 sm:pt-6 sm:pr-0">
          © {new Date().getFullYear()} {SITE_NAME}. {dict.footer.rights}
        </div>

        {/* Faint oversized wordmark watermark, clipped within the footer. On
            phones it is fainter and its baseline sinks just past the
            footer's bottom edge, so it reads as a deliberate crop. */}
        <p
          aria-hidden="true"
          className="pointer-events-none mt-3 -mb-12 -ml-0.5 select-none text-[3.25rem] leading-none font-extrabold tracking-tight whitespace-nowrap text-white/[0.03] sm:mt-2 sm:-mb-6 sm:-ml-1 sm:text-[5.5rem] sm:text-white/[0.04] lg:text-[7rem]"
        >
          DAKAR AUTO
        </p>
      </div>
    </footer>
  )
}

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
        className="pointer-events-none absolute -right-16 -bottom-16 h-72 w-72 text-white/[0.07] sm:h-96 sm:w-96"
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
      <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 text-accent/40 sm:h-40 sm:w-40">
        <line x1="0" y1="150" x2="150" y2="0" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="120" x2="120" y2="0" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight">
              DAKAR <span className="text-accent">AUTO</span>
            </p>
            <p className="mt-3 max-w-xs text-[0.95rem] text-header-muted">{dict.footer.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-[0.2em] text-header-muted uppercase">{dict.footer.navTitle}</h3>
            <ul className="mt-4 space-y-3 text-[0.95rem]">
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
            <div>
              <h3 className="text-sm font-semibold tracking-[0.2em] text-header-muted uppercase">{dict.footer.contactTitle}</h3>
              <ul className="mt-4 space-y-3.5 text-[0.95rem] text-header-muted">
                {settings.email && (
                  <li className="flex items-center gap-2.5">
                    <MailIcon className="h-[18px] w-[18px] shrink-0 text-accent" />
                    <a href={`mailto:${settings.email}`} className="transition duration-200 hover:text-accent">
                      {settings.email}
                    </a>
                  </li>
                )}
                {settings.phone && (
                  <li className="flex items-center gap-2.5">
                    <PhoneIcon className="h-[18px] w-[18px] shrink-0 text-accent" />
                    <a href={`tel:${normalizePhoneDigits(settings.phone)}`} className="transition duration-200 hover:text-accent">
                      {settings.phone}
                    </a>
                  </li>
                )}
                {settings.whatsapp && (
                  <li className="flex items-center gap-2.5">
                    <WhatsAppIcon className="h-[18px] w-[18px] shrink-0 text-accent" />
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
                  <li className="flex items-center gap-2.5">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0 text-accent">
                      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="9.5" r="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{settings.address}</span>
                  </li>
                )}
              </ul>
              {hasSocialRow && (
                <div className="mt-4 flex items-center gap-3">
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-header-muted transition duration-200 hover:border-accent hover:text-accent"
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
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-header-muted transition duration-200 hover:border-accent hover:text-accent"
                    >
                      <FacebookIcon className="h-[18px] w-[18px]" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold tracking-[0.2em] text-header-muted uppercase">{dict.footer.legalTitle}</h3>
            <ul className="mt-4 space-y-3 text-[0.95rem]">
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

        <div className="relative mt-12 border-t border-white/10 pt-6 text-sm text-header-muted">
          © {new Date().getFullYear()} {SITE_NAME}. {dict.footer.rights}
        </div>

        {/* Faint oversized wordmark watermark, clipped within the footer */}
        <p
          aria-hidden="true"
          className="pointer-events-none mt-2 -mb-6 -ml-1 select-none text-[3.5rem] leading-none font-extrabold tracking-tight text-white/[0.04] sm:text-[5.5rem] lg:text-[7rem]"
        >
          DAKAR AUTO
        </p>
      </div>
    </footer>
  )
}

import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-bold tracking-tight">
              DAKAR <span className="text-accent">AUTO</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{dict.footer.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              {dict.footer.navTitle}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-accent">
                  {dict.header.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/#parts-categories" className="hover:text-accent">
                  {dict.header.nav.parts}
                </Link>
              </li>
              <li>
                <Link href="/#source-a-vehicle" className="hover:text-accent">
                  {dict.header.nav.sourceVehicle}
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-accent">
                  {dict.header.nav.contact}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              {dict.footer.contactTitle}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>{dict.contact.email.value}</li>
              <li>{dict.contact.phone.value}</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              {dict.footer.legalTitle}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-accent">
                  {dict.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-accent">
                  {dict.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Dakar Auto. {dict.footer.rights}
        </div>
      </div>
    </footer>
  )
}

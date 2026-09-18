import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'

// Shown when /admin/reset-password is reached without a valid recovery
// session (expired link, already-used link, tampered URL, or a direct visit
// with no session at all) — never a blank screen and never a raw Supabase
// error string.
export function InvalidResetLink({ dict }: { dict: Dictionary }) {
  const t = dict.admin.resetPasswordPage

  return (
    <div className={cardClasses({ padding: 'md', className: 'mt-6 w-full' })}>
      <div className="flex flex-col items-center text-center">
        <AlertCircle className="h-10 w-10 text-red-500" strokeWidth={1.75} />
        <h1 className="mt-3 text-xl font-bold tracking-tight">{t.invalidLinkTitle}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t.invalidLinkMessage}</p>
      </div>
      <Link href="/admin/login" className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, pill: true, className: 'mt-6' })}>
        {t.requestNewLink}
      </Link>
    </div>
  )
}

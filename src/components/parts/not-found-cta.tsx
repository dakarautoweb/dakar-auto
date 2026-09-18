import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses } from '@/src/components/ui/styles'
import { SearchIcon, ArrowRightIcon } from '@/src/components/home/icons'

// One premium full-width bar — search icon + heading + subtext on the
// left, a single orange pill CTA on the right — matching the approved
// reference exactly, instead of the "can't find it" case living as one
// more tile inside the subcategory grid.
export function PartsNotFoundCta({ dict }: { dict: Dictionary }) {
  const t = dict.categories.cantFind
  return (
    <div className="flex flex-col items-start gap-5 rounded-3xl border border-border bg-gradient-to-br from-card to-surface/60 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-4">
        <SearchIcon className="h-9 w-9 shrink-0 text-accent" />
        <div>
          <h3 className="text-lg font-bold tracking-tight">{t.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
        </div>
      </div>
      <Link href="/vehicle/identify" className={buttonClasses({ variant: 'primary', size: 'lg', pill: true, className: 'w-full shrink-0 sm:w-auto' })}>
        {t.cta}
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  )
}

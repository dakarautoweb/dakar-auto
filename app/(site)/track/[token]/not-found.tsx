import Link from 'next/link'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { iconCircleClasses } from '@/src/components/ui/styles'
import { RouteIcon } from '@/src/components/home/icons'

// Reached whenever getTrackingInfo() returns null — invalid token shape,
// or no request matches it. Deliberately generic: never reveals whether
// the token was malformed vs. simply not found, so this can't be used to
// probe for valid tokens.
export default async function TrackNotFound() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.tracking

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <span className={iconCircleClasses({ size: 'lg' })}>
        <RouteIcon className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">{t.notFoundTitle}</h1>
      <p className="mt-2 text-muted-foreground">{t.notFoundDescription}</p>
      <Link href="/" className="mt-6 text-sm font-medium text-accent hover:underline">
        {dict.wizard.success.backHome}
      </Link>
    </div>
  )
}

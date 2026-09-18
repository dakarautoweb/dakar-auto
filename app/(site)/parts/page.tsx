import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { PartsPageClient } from '@/src/components/parts/parts-page-client'

export default async function PartsPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)

  return <PartsPageClient dict={dict} />
}

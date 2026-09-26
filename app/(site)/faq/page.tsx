import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getPublicFaqItems } from '@/src/services/faq/queries'
import { SectionHeading } from '@/src/components/home/section-heading'
import { FaqAccordion } from '@/src/components/faq-accordion'

export default async function FaqPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.faqPage
  const items = await getPublicFaqItems(locale)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="mt-10">
        {items.length > 0 ? <FaqAccordion items={items} /> : <p className="text-center text-sm text-muted-foreground">{t.empty}</p>}
      </div>
    </div>
  )
}

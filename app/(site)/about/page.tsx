import Link from 'next/link'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { HeroBackdrop } from '@/src/components/home/hero-backdrop'
import { SectionHeading } from '@/src/components/home/section-heading'
import { TrustIcon, MissionIcon, FlagIcon, ArrowRightIcon } from '@/src/components/home/icons'
import { buttonClasses, cardClasses, iconCircleClasses } from '@/src/components/ui/styles'

export default async function AboutPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.aboutPage

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border">
        <HeroBackdrop position="center" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/70 to-background/40" />

        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t.eyebrow}</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-5xl">{t.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t.description}</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className={cardClasses({ tone: 'raised', padding: 'lg', className: 'flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8' })}>
          <MissionIcon className="h-20 w-28 shrink-0 sm:h-24 sm:w-32" />
          <span className="hidden h-24 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
          <div>
            <span className="block h-[3px] w-9 rounded-full bg-accent" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{t.missionTitle}</h2>
            <p className="mt-3 text-muted-foreground">{t.missionBody}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <SectionHeading title={t.valuesTitle} center />
        <div className="mx-auto mt-3 h-[3px] w-9 rounded-full bg-accent" aria-hidden="true" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dict.trust.items.map((item, i) => (
            <div
              key={item.title}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-glow"
            >
              <TrustIcon index={i} className="h-11 w-11 shrink-0 text-accent" />
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className={cardClasses({ tone: 'raised', padding: 'lg', className: 'relative flex flex-col items-center gap-6 overflow-hidden text-center' })}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rotate-12 opacity-[0.06]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--foreground) 0 2px, transparent 2px 10px)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 -rotate-12 opacity-[0.06]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--foreground) 0 2px, transparent 2px 10px)' }}
          />
          <span className={iconCircleClasses({ size: 'lg', tone: 'gold' })}>
            <FlagIcon className="h-8 w-8" />
          </span>
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">{t.ctaTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.ctaDescription}</p>
          </div>
          <div className="relative flex flex-wrap items-center justify-center gap-3">
            <Link href="/vehicle/identify" className={buttonClasses({ variant: 'primary', size: 'lg', pill: true })}>
              {t.ctaPrimary}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/source-a-vehicle" className={buttonClasses({ variant: 'secondary', size: 'lg', pill: true })}>
              {t.ctaSecondary}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

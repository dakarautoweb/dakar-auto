import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary, type Dictionary } from '@/src/i18n/dictionaries'
import { getPublicTrackingInfo } from '@/src/services/tracking/get-public-tracking-info'
import type { TrackingInfo } from '@/src/services/tracking/types'
import type { VehicleTrackingInfo } from '@/src/services/tracking/vehicle-types'
import { StatusTimeline, PARTS_MAIN_STEPS, VEHICLE_MAIN_STEPS } from '@/src/components/tracking/status-timeline'
import { cardClasses } from '@/src/components/ui/styles'
import { ArrowRightIcon, CarSideIcon, MailIcon, NotesIcon, PhoneIcon, SettingsGearIcon, WhatsAppIcon } from '@/src/components/home/icons'
import { yearRangeLine, mileageRangeLine, budgetRangeLine } from '@/src/services/email/templates/vehicle-request-format'

// Public, unauthenticated — anyone with the link can view it, no admin
// session, no customer login. Read-only: this route (and everything it
// calls) never writes to the database, so there is no way for a visitor
// to change a request's status from here.

const CONTACT_METHOD_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  phone: PhoneIcon,
  email: MailIcon,
}

// One large icon + label/content row, divided from its siblings — the
// shared recipe for every row inside the "RÉSUMÉ DE LA DEMANDE" card.
function SummaryRow({ icon, title, children }: { icon: ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-5 first:pt-0 last:pb-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h3>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  )
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

export default async function TrackRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const info = await getPublicTrackingInfo(token)
  if (!info) notFound()

  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const t = dict.tracking

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          <span className="h-px w-6 bg-accent/60" aria-hidden="true" />
          {t.eyebrow}
        </span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-1 text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
              <NotesIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{dict.wizard.success.requestNumberLabel}</p>
              <p className="mt-0.5 font-mono text-lg font-bold sm:text-xl">{info.data.requestNumber}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.admin.detail.createdAtLabel} {formatDate(info.data.createdAt, locale)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {info.kind === 'parts' ? <PartsSummary info={info.data} dict={dict} locale={locale} /> : <VehicleSummary info={info.data} dict={dict} locale={locale} />}
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition duration-200 hover:underline"
        >
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
          {dict.wizard.success.backHome}
        </Link>
      </div>
    </div>
  )
}

// Unchanged from before getPublicTrackingInfo existed — same JSX, only the
// data source changed (info.data instead of a bare info).
function PartsSummary({ info, dict, locale }: { info: TrackingInfo; dict: Dictionary; locale: string }) {
  const t = dict.tracking
  const categoryTitle = (key: string) => dict.categories.items.find((c) => c.key === key)?.title ?? dict.categories.cantFind.title
  const contactMethodLabel =
    { whatsapp: dict.contact.whatsapp.label, phone: dict.contact.phone.label, email: dict.contact.email.label }[
      info.preferredContactMethod
    ] ?? info.preferredContactMethod
  const conditionLabels: Record<string, string> = {
    oem: dict.wizard.partDetails.conditionOem,
    aftermarket: dict.wizard.partDetails.conditionAftermarket,
    used: dict.wizard.partDetails.conditionUsed,
    no_preference: dict.wizard.partDetails.conditionNoPreference,
  }
  const ContactIcon = CONTACT_METHOD_ICONS[info.preferredContactMethod] ?? PhoneIcon

  return (
    <>
      <section className={cardClasses({ tone: 'raised', padding: 'md' })}>
        <h2 className="mb-5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.currentStatusLabel}</h2>
        <StatusTimeline dict={dict} locale={locale} status={info.status} history={info.statusHistory} mainSteps={PARTS_MAIN_STEPS} />
      </section>

      <section className={cardClasses({ padding: 'md' })}>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.summaryTitle}</h2>

        <div className="mt-2 divide-y divide-border">
          {info.vehicle && (
            <SummaryRow icon={<CarSideIcon className="h-6 w-6" />} title={dict.admin.detail.vehicleSection}>
              <p className="text-lg font-bold tracking-tight">{[info.vehicle.year, info.vehicle.make, info.vehicle.model].filter(Boolean).join(' ')}</p>
            </SummaryRow>
          )}

          <SummaryRow icon={<SettingsGearIcon className="h-6 w-6" />} title={dict.admin.detail.partsSection}>
            <div className="space-y-3">
              {info.items.map((item, index) => (
                <div key={index} className="rounded-xl border border-border bg-surface/60 p-4">
                  <p className="font-semibold">
                    {categoryTitle(item.category)} — <span className="font-bold">{item.partName}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dict.admin.detail.part.quantity} : {item.quantity} · {dict.admin.detail.part.condition} :{' '}
                    {conditionLabels[item.conditionPreference] ?? item.conditionPreference}
                  </p>
                  {item.description && <p className="mt-2 text-sm whitespace-pre-line">{item.description}</p>}
                </div>
              ))}
            </div>
          </SummaryRow>

          <SummaryRow icon={<ContactIcon className="h-6 w-6" />} title={dict.wizard.review.preferredSection}>
            <p className="text-lg font-bold tracking-tight">{contactMethodLabel}</p>
          </SummaryRow>
        </div>
      </section>
    </>
  )
}

// Vehicle sourcing (VR-) requests have no status-history table (see
// get-vehicle-tracking-info.ts) — StatusTimeline gets no `history` prop at
// all here, so it renders only the current-status stepper, never a
// misleading "no history yet" for a request type that can never have one.
function VehicleSummary({ info, dict, locale }: { info: VehicleTrackingInfo; dict: Dictionary; locale: string }) {
  const t = dict.tracking
  const v = dict.admin.vehicleRequestDetail.vehicle
  const contactMethodLabel =
    { whatsapp: dict.contact.whatsapp.label, phone: dict.contact.phone.label, email: dict.contact.email.label }[
      info.preferredContactMethod
    ] ?? info.preferredContactMethod

  const years = yearRangeLine(info.vehicle)
  const mileage = mileageRangeLine(info.vehicle)
  const budget = budgetRangeLine(info.vehicle)

  const fields: { label: string; value: string | null }[] = [
    { label: v.make, value: info.vehicle.make },
    { label: v.model, value: info.vehicle.model },
    { label: v.yearRange, value: years },
    { label: v.color, value: info.vehicle.color },
    { label: v.engine, value: info.vehicle.engine },
    { label: v.transmission, value: info.vehicle.transmission },
    { label: v.mileageRange, value: mileage },
    { label: v.trimLevel, value: info.vehicle.trimLevel },
    { label: v.budgetRange, value: budget },
  ].filter((field): field is { label: string; value: string } => Boolean(field.value))
  const ContactIcon = CONTACT_METHOD_ICONS[info.preferredContactMethod] ?? PhoneIcon

  return (
    <>
      <section className={cardClasses({ tone: 'raised', padding: 'md' })}>
        <h2 className="mb-5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.currentStatusLabel}</h2>
        <StatusTimeline dict={dict} locale={locale} status={info.status} mainSteps={VEHICLE_MAIN_STEPS} statusMap={dict.admin.vehicleStatuses} />
      </section>

      <section className={cardClasses({ padding: 'md' })}>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.summaryTitle}</h2>

        <div className="mt-2 divide-y divide-border">
          <SummaryRow icon={<CarSideIcon className="h-6 w-6" />} title={dict.admin.vehicleRequestDetail.vehicleSection}>
            {fields.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {fields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{field.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{dict.admin.vehicleRequestDetail.notProvided}</p>
            )}
          </SummaryRow>

          {info.vehicle.otherPreferences && (
            <SummaryRow icon={<NotesIcon className="h-6 w-6" />} title={dict.admin.vehicleRequestDetail.vehicle.otherPreferences}>
              <p className="text-sm whitespace-pre-line">{info.vehicle.otherPreferences}</p>
            </SummaryRow>
          )}

          <SummaryRow icon={<ContactIcon className="h-6 w-6" />} title={dict.vehicleRequestWizard.review.preferredSection}>
            <p className="text-lg font-bold tracking-tight">{contactMethodLabel}</p>
          </SummaryRow>
        </div>
      </section>
    </>
  )
}

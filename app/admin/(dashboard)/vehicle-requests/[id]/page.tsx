import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getVehicleRequestDetail } from '@/src/services/admin/queries'
import { saveVehicleRequestNotesAction } from '@/src/services/admin/vehicle-request-actions'
import { StatusBadge } from '@/src/components/admin/status-badge'
import { ContactActions } from '@/src/components/admin/contact-actions'
import { NotesEditor } from '@/src/components/admin/notes-editor'
import { VehicleStatusUpdater } from '@/src/components/admin/vehicle-status-updater'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}

function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

function yearRangeLabel(yearFrom: number | null, yearTo: number | null): string | undefined {
  if (yearFrom && yearTo) return yearFrom === yearTo ? String(yearFrom) : `${yearFrom} – ${yearTo}`
  if (yearFrom) return `${yearFrom}+`
  if (yearTo) return `≤ ${yearTo}`
  return undefined
}

function mileageRangeLabel(min: number | null, max: number | null): string | undefined {
  if (min != null && max != null) return `${min} – ${max} km`
  if (min != null) return `≥ ${min} km`
  if (max != null) return `≤ ${max} km`
  return undefined
}

function budgetRangeLabel(min: number | null, max: number | null, currency: string): string | undefined {
  if (min != null && max != null) return `${min} – ${max} ${currency}`
  if (min != null) return `≥ ${min} ${currency}`
  if (max != null) return `≤ ${max} ${currency}`
  return undefined
}

export default async function AdminVehicleRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)

  const detail = await getVehicleRequestDetail(id)
  if (!detail) notFound()

  const t = dict.admin.vehicleRequestDetail

  return (
    <div className="space-y-6">
      <Link href="/admin/vehicle-requests" className="text-sm font-medium text-accent hover:underline">
        ← {t.backToList}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{detail.request_number}</p>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge dict={dict} status={detail.status} statusMap={dict.admin.vehicleStatuses} />
            <span className="text-sm text-muted-foreground">
              {t.createdAtLabel} {formatDateTime(detail.created_at, locale)}
            </span>
          </div>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
          {t.localeLabel}: {detail.locale}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={t.customerSection}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={dict.wizard.contact.nameLabel} value={detail.customer_name} />
              <Field label={dict.wizard.contact.phoneLabel} value={detail.customer_phone} />
              <Field label={dict.wizard.contact.emailLabel} value={detail.customer_email ?? t.notProvided} />
              <Field
                label={dict.wizard.review.preferredSection}
                value={
                  {
                    whatsapp: dict.contact.whatsapp.label,
                    phone: dict.contact.phone.label,
                    email: dict.contact.email.label,
                  }[detail.preferred_contact_method] ?? detail.preferred_contact_method
                }
              />
            </div>
            <div className="mt-4">
              <ContactActions
                dict={dict}
                phone={detail.customer_phone}
                whatsappPhone={detail.whatsapp_phone}
                email={detail.customer_email}
              />
            </div>
          </Section>

          <Section title={t.vehicleSection}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={t.vehicle.make} value={detail.make ?? t.notProvided} />
              <Field label={t.vehicle.model} value={detail.model ?? t.notProvided} />
              <Field label={t.vehicle.yearRange} value={yearRangeLabel(detail.year_from, detail.year_to)} />
              <Field label={t.vehicle.color} value={detail.color ?? undefined} />
              <Field label={t.vehicle.engine} value={detail.engine ?? undefined} />
              <Field label={t.vehicle.transmission} value={detail.transmission ?? undefined} />
              <Field label={t.vehicle.mileageRange} value={mileageRangeLabel(detail.mileage_min, detail.mileage_max)} />
              <Field label={t.vehicle.trimLevel} value={detail.trim_level ?? undefined} />
              <Field
                label={t.vehicle.budgetRange}
                value={budgetRangeLabel(detail.budget_min, detail.budget_max, detail.currency)}
              />
            </div>
            {detail.other_preferences && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">{t.vehicle.otherPreferences}</p>
                <p className="mt-0.5 text-sm whitespace-pre-line">{detail.other_preferences}</p>
              </div>
            )}
          </Section>

          <Section title={t.notesSection}>
            <NotesEditor
              requestId={detail.id}
              initialNotes={detail.admin_notes}
              saveAction={saveVehicleRequestNotesAction}
              texts={{
                description: t.notesDescription,
                placeholder: t.notesPlaceholder,
                save: t.notesSave,
                saving: t.notesSaving,
                saved: t.notesSaved,
                error: t.notesError,
              }}
            />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title={t.statusUpdateSection}>
            <VehicleStatusUpdater dict={dict} requestId={detail.id} currentStatus={detail.status} />
          </Section>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getPartsRequestDetail, getStatusHistory } from '@/src/services/admin/queries'
import { createSignedAttachmentUrls } from '@/src/services/admin/attachments'
import { StatusBadge } from '@/src/components/admin/status-badge'
import { ContactActions } from '@/src/components/admin/contact-actions'
import { PhotoGallery, type GalleryPhoto } from '@/src/components/admin/photo-gallery'
import { NotesEditor } from '@/src/components/admin/notes-editor'
import { StatusUpdater } from '@/src/components/admin/status-updater'
import { StatusHistoryList } from '@/src/components/admin/status-history-list'
import { saveAdminNotesAction } from '@/src/services/admin/actions'

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

const conditionLabelMap: Record<string, string> = {
  oem: 'conditionOem',
  aftermarket: 'conditionAftermarket',
  used: 'conditionUsed',
  no_preference: 'conditionNoPreference',
}

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)

  const [detail, history] = await Promise.all([getPartsRequestDetail(id), getStatusHistory(id)])
  if (!detail) notFound()

  const attachmentPaths = detail.attachments.map((a) => a.file_url)
  const signedUrls = await createSignedAttachmentUrls(attachmentPaths)

  const photos: GalleryPhoto[] = detail.attachments.map((a) => ({
    id: a.id,
    url: signedUrls.get(a.file_url) ?? null,
    fileName: a.file_name,
    attachmentType: a.attachment_type,
  }))

  const t = dict.admin.detail
  const categoryTitle = (key: string) => dict.categories.items.find((c) => c.key === key)?.title ?? dict.categories.cantFind.title

  return (
    <div className="space-y-6">
      <Link href="/admin/requests" className="text-sm font-medium text-accent hover:underline">
        ← {t.backToList}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{detail.request_number}</p>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge dict={dict} status={detail.status} />
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
            {detail.vehicle ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label={t.vehicle.vin} value={detail.vehicle.vin ?? t.notProvided} />
                <Field label={t.vehicle.year} value={detail.vehicle.year ?? undefined} />
                <Field label={t.vehicle.make} value={detail.vehicle.make} />
                <Field label={t.vehicle.model} value={detail.vehicle.model} />
                <Field label={t.vehicle.trim} value={detail.vehicle.trim ?? undefined} />
                <Field label={t.vehicle.engine} value={detail.vehicle.engine ?? undefined} />
                <Field label={t.vehicle.transmission} value={detail.vehicle.transmission ?? undefined} />
                <Field label={t.vehicle.bodyStyle} value={detail.vehicle.body_style ?? undefined} />
                <Field label={t.vehicle.fuelType} value={detail.vehicle.fuel_type ?? undefined} />
                <Field label={t.vehicle.drivetrain} value={detail.vehicle.drivetrain ?? undefined} />
                <Field label={t.vehicle.identificationMethod} value={detail.vehicle.identification_method} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.notProvided}</p>
            )}
            {detail.vehicle?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.vehicle.image_url}
                alt=""
                className="mt-4 max-h-48 rounded-xl border border-border object-contain"
              />
            )}
          </Section>

          <Section title={t.partsSection}>
            <div className="space-y-4">
              {detail.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label={t.part.category} value={categoryTitle(item.category)} />
                    <Field label={t.part.subcategory} value={item.subcategory ?? undefined} />
                    <Field label={t.part.partName} value={item.part_name} />
                    <Field label={t.part.quantity} value={item.quantity} />
                    <Field
                      label={t.part.condition}
                      value={dict.wizard.partDetails[conditionLabelMap[item.condition_preference] as keyof typeof dict.wizard.partDetails] as string}
                    />
                  </div>
                  {item.description && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">{t.part.description}</p>
                      <p className="mt-0.5 text-sm whitespace-pre-line">{item.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title={t.photosSection}>
            <PhotoGallery dict={dict} photos={photos} />
          </Section>

          <Section title={t.notesSection}>
            <NotesEditor
              requestId={detail.id}
              initialNotes={detail.admin_notes}
              saveAction={saveAdminNotesAction}
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
            <StatusUpdater dict={dict} requestId={detail.id} currentStatus={detail.status} />
          </Section>

          <Section title={t.historySection}>
            <StatusHistoryList dict={dict} entries={history} locale={locale} />
          </Section>
        </div>
      </div>
    </div>
  )
}

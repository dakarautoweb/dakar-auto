import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowLeft,
  Globe,
  ChevronDown,
  User,
  Car,
  Settings2,
  Image as ImageIcon,
  StickyNote,
  Package,
  Wrench,
  Hash,
  FileText,
  RotateCw,
  ListChecks,
  Clock,
  Eye,
  Calendar,
  Tag,
  Sparkles,
  Cpu,
  Box,
  Fuel,
  Navigation,
  ScanLine,
} from 'lucide-react'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { getPartsRequestDetail, getStatusHistory } from '@/src/services/admin/queries'
import { createSignedAttachmentUrls } from '@/src/services/admin/attachments'
import { StatusBadge } from '@/src/components/admin/status-badge'
import { ContactActions } from '@/src/components/admin/contact-actions'
import { PhotoGallery, type GalleryPhoto } from '@/src/components/admin/photo-gallery'
import { CustomerFieldsMobile, VehicleSpecsMobile } from '@/src/components/admin/request-detail-mobile'
import { VehicleImage } from '@/src/components/vehicle-image'
import { lookupCarImage } from '@/src/services/car-image/car-image-service'
import { isImageUrlExpired } from '@/src/services/car-image/image-url-expiry'
import { NotesEditor } from '@/src/components/admin/notes-editor'
import { StatusUpdater } from '@/src/components/admin/status-updater'
import { StatusHistoryList } from '@/src/components/admin/status-history-list'
import { StatusStepper } from '@/src/components/admin/status-stepper'
import { saveAdminNotesAction } from '@/src/services/admin/actions'
import { bulkArchiveRequestsAction, bulkRestoreRequestsAction } from '@/src/services/admin/bulk-actions'
import { ArchiveToggleButton } from '@/src/components/admin/archive-toggle-button'
import { cardClasses } from '@/src/components/ui/styles'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Section({
  title,
  icon: Icon,
  description,
  children,
  emphasized = false,
}: {
  title: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  description?: string
  children: ReactNode
  emphasized?: boolean
}) {
  return (
    <section className={cardClasses({ padding: 'sm', tone: emphasized ? 'accent' : 'default' })}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
          {title}
        </h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

function VehicleField({ icon: Icon, label, value }: { icon: IconType; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

function PartTile({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface/60 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
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

  // vehicles.image_url is only ever persisted when it's a durable URL
  // (see create-request.ts) — a CarImages API result is never written
  // there since its signed URLs expire. So when it's null (or, for an
  // older row saved before that guard existed, actually expired), re-derive
  // a fresh one live for just this render — never written back to the DB,
  // best-effort only, and never allowed to block the page.
  let vehicleImageUrl = detail.vehicle?.image_url ?? null
  if (detail.vehicle && (!vehicleImageUrl || isImageUrlExpired(vehicleImageUrl)) && detail.vehicle.year && detail.vehicle.make && detail.vehicle.model) {
    try {
      const liveResult = await lookupCarImage({
        year: detail.vehicle.year,
        make: detail.vehicle.make,
        model: detail.vehicle.model,
        bodyStyle: detail.vehicle.body_style,
      })
      if (liveResult.status === 'found') vehicleImageUrl = liveResult.imageUrl
    } catch {
      // Best-effort only — the fallback image covers this either way.
    }
  }

  const t = dict.admin.detail
  const categoryTitle = (key: string) => dict.categories.items.find((c) => c.key === key)?.title ?? dict.categories.cantFind.title

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition duration-200 hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          {t.backToList}
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">{detail.request_number}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <StatusBadge dict={dict} status={detail.status} />
              <span className="text-border" aria-hidden="true">
                |
              </span>
              <span className="text-sm text-muted-foreground">
                {t.createdAtLabel} {formatDateTime(detail.created_at, locale)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArchiveToggleButton
              dict={dict}
              requestId={detail.id}
              archivedAt={detail.archived_at}
              archiveAction={bulkArchiveRequestsAction}
              restoreAction={bulkRestoreRequestsAction}
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface/60 px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Globe className="h-3.5 w-3.5" strokeWidth={2} />
              {t.localeLabel}: {detail.locale}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={t.customerSection} icon={User} description={t.customerSectionDescription}>
            {(() => {
              const emailValue = detail.customer_email ?? t.notProvided
              const preferredValue =
                {
                  whatsapp: dict.contact.whatsapp.label,
                  phone: dict.contact.phone.label,
                  email: dict.contact.email.label,
                }[detail.preferred_contact_method] ?? detail.preferred_contact_method

              return (
                <>
                  {/* Mobile (<640px): the same two pairs, but as divided rows
                      so the values stop running together vertically. */}
                  <CustomerFieldsMobile
                    labels={{
                      name: dict.wizard.contact.nameLabel,
                      phone: dict.wizard.contact.phoneLabel,
                      email: dict.wizard.contact.emailLabel,
                      preferred: dict.wizard.review.preferredSection,
                    }}
                    name={detail.customer_name}
                    phone={detail.customer_phone}
                    email={emailValue}
                    preferredContact={preferredValue}
                  />

                  {/* sm+ / desktop: unchanged. */}
                  <div className="hidden gap-4 sm:grid sm:grid-cols-3">
                    <Field label={dict.wizard.contact.nameLabel} value={detail.customer_name} />
                    <Field label={dict.wizard.contact.phoneLabel} value={detail.customer_phone} />
                    <Field label={dict.wizard.contact.emailLabel} value={emailValue} />
                    <Field label={dict.wizard.review.preferredSection} value={preferredValue} />
                  </div>
                </>
              )
            })()}
            <div className="mt-4">
              <ContactActions
                dict={dict}
                phone={detail.customer_phone}
                whatsappPhone={detail.whatsapp_phone}
                email={detail.customer_email}
              />
            </div>
          </Section>

          <Section title={t.vehicleSection} icon={Car} description={t.vehicleSectionDescription}>
            {detail.vehicle ? (
              <>
                {/* Mobile (<640px): compact 2-column grid + full-width VIN/Identification rows + a dedicated image panel below. */}
                <VehicleSpecsMobile
                  vehicle={detail.vehicle}
                  labels={t.vehicle}
                  notProvided={t.notProvided}
                  imageUrl={vehicleImageUrl}
                  imageUnavailableLabel={t.vehicleImageUnavailable}
                />

                {/* sm+ / desktop: unchanged from before. */}
                <div className="hidden gap-6 sm:flex sm:flex-col lg:flex-row lg:items-stretch">
                  <div className="flex-1 divide-y divide-border">
                    {chunk(
                      (
                        [
                          { icon: Eye, label: t.vehicle.vin, value: detail.vehicle.vin ?? t.notProvided },
                          { icon: Calendar, label: t.vehicle.year, value: detail.vehicle.year ?? undefined },
                          { icon: Tag, label: t.vehicle.make, value: detail.vehicle.make },
                          { icon: Car, label: t.vehicle.model, value: detail.vehicle.model },
                          { icon: Sparkles, label: t.vehicle.trim, value: detail.vehicle.trim ?? undefined },
                          { icon: Cpu, label: t.vehicle.engine, value: detail.vehicle.engine ?? undefined },
                          { icon: Settings2, label: t.vehicle.transmission, value: detail.vehicle.transmission ?? undefined },
                          { icon: Box, label: t.vehicle.bodyStyle, value: detail.vehicle.body_style ?? undefined },
                          { icon: Fuel, label: t.vehicle.fuelType, value: detail.vehicle.fuel_type ?? undefined },
                          { icon: Navigation, label: t.vehicle.drivetrain, value: detail.vehicle.drivetrain ?? undefined },
                          { icon: ScanLine, label: t.vehicle.identificationMethod, value: detail.vehicle.identification_method },
                        ] as Array<{ icon: IconType; label: string; value: string | number | undefined }>
                      ).filter((f) => Boolean(f.value)),
                      3
                    ).map((row, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-border ${i === 0 ? 'pb-4' : 'py-4'}`}
                      >
                        {row.map((f) => (
                          <div key={f.label} className="sm:px-4 sm:first:pl-0 sm:last:pr-0">
                            <VehicleField icon={f.icon} label={f.label} value={f.value} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="h-56 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface lg:h-auto lg:w-80">
                    <VehicleImage
                      src={vehicleImageUrl}
                      className="h-full w-full object-contain"
                      variant="placeholder"
                      placeholderLabel={t.vehicleImageUnavailable}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t.notProvided}</p>
            )}
          </Section>

          <Section title={t.partsSection} icon={Settings2} description={t.partsSectionDescription}>
            <div className="space-y-4">
              {detail.items.map((item) => (
                <div key={item.id}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <PartTile icon={Package} label={t.part.category} value={categoryTitle(item.category)} />
                    <PartTile icon={Wrench} label={t.part.partName} value={item.part_name} />
                    <PartTile icon={Hash} label={t.part.quantity} value={item.quantity} />
                    <PartTile
                      icon={FileText}
                      label={t.part.condition}
                      value={dict.wizard.partDetails[conditionLabelMap[item.condition_preference] as keyof typeof dict.wizard.partDetails] as string}
                    />
                  </div>
                  {(item.subcategory || item.description) && (
                    <div className="mt-2 space-y-1 px-1">
                      {item.subcategory && (
                        <p className="text-xs text-muted-foreground">
                          {t.part.subcategory}: <span className="font-medium text-foreground">{item.subcategory}</span>
                        </p>
                      )}
                      {item.description && <p className="text-sm whitespace-pre-line text-foreground">{item.description}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title={t.photosSection} icon={ImageIcon} description={t.photosSectionDescription}>
            <PhotoGallery dict={dict} photos={photos} />
          </Section>

          <Section title={t.notesSection} icon={StickyNote}>
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
          <Section title={t.statusUpdateSection} icon={RotateCw}>
            <StatusUpdater dict={dict} requestId={detail.id} currentStatus={detail.status} />
          </Section>

          <Section title={t.statusStepperSection} icon={ListChecks}>
            <StatusStepper dict={dict} currentStatus={detail.status} createdAt={detail.created_at} history={history} locale={locale} />
          </Section>

          <Section title={t.historySection} icon={Clock}>
            <StatusHistoryList dict={dict} entries={history} locale={locale} />
          </Section>
        </div>
      </div>
    </div>
  )
}

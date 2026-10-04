'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, Send, Search, Warehouse, PenLine } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { AdminVehicle } from '@/src/services/inventory/types'
import { VEHICLE_REQUEST_STATUSES } from '@/src/services/admin/vehicle-request-statuses'
import { updateVehicleRequestStatusAction } from '@/src/services/admin/vehicle-request-actions'
import { buttonClasses } from '@/src/components/ui/styles'
import { STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from '@/src/components/admin/status-badge'
import { StatusSelect } from '@/src/components/admin/status-select'
import { VehicleImage } from '@/src/components/vehicle-image'

type Source = 'inventory' | 'manual'

export function VehicleStatusUpdater({
  dict,
  requestId,
  currentStatus,
  inventory,
}: {
  dict: Dictionary
  requestId: string
  currentStatus: string
  inventory: AdminVehicle[]
}) {
  const router = useRouter()
  const manualForm = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState(currentStatus)
  const [source, setSource] = useState<Source>('inventory')
  const [search, setSearch] = useState('')
  const [inventoryId, setInventoryId] = useState('')
  const [manual, setManual] = useState({ make: '', model: '', year: '', price: '', currency: 'CAD' })
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)
  const [pending, startTransition] = useTransition()
  const t = dict.admin.vehicleRequestDetail
  const found = t.foundVehicle
  const statusLabels = dict.admin.vehicleStatuses as Record<string, string>
  const selectedVehicle = inventory.find((vehicle) => vehicle.id === inventoryId)
  const inventoryOptions = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return inventory
    return inventory.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase().includes(needle))
  }, [inventory, search])

  useEffect(() => () => {
    if (manualPhotoPreview) URL.revokeObjectURL(manualPhotoPreview)
  }, [manualPhotoPreview])

  function handleSubmit() {
    setFeedback(null)
    const formData = status === 'vehicle_found' ? new FormData(manualForm.current ?? undefined) : undefined
    if (formData) {
      formData.set('source', source)
      if (source === 'inventory') formData.set('inventoryVehicleId', inventoryId)
    }
    startTransition(async () => {
      const result = await updateVehicleRequestStatusAction(requestId, status, formData)
      if (result.ok) {
        setFeedback('success')
        router.refresh()
      } else {
        setFeedback('error')
      }
    })
  }

  const manualReady = Boolean(manual.make.trim() && manual.model.trim() && manual.year && manual.currency)
  const vehicleFoundReady = status !== 'vehicle_found' || (source === 'inventory' ? Boolean(selectedVehicle) : manualReady)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="vehicle-status-select" className="mb-1.5 block text-sm font-medium text-muted-foreground">
          {t.statusUpdateNewStatusLabel}
        </label>
        <StatusSelect
          id="vehicle-status-select"
          value={status}
          onChange={setStatus}
          statuses={VEHICLE_REQUEST_STATUSES}
          labels={statusLabels}
          icons={STATUS_ICONS}
          chipClasses={STATUS_ICON_CHIP_CLASSES}
          ariaLabel={t.statusUpdateNewStatusLabel}
        />
      </div>

      {status === 'vehicle_found' && (
        <form ref={manualForm} className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <div>
            <p className="text-sm font-semibold">{found.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{found.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['inventory', 'manual'] as const).map((value) => {
              const Icon = value === 'inventory' ? Warehouse : PenLine
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSource(value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    source === value ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-card hover:border-accent/40'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {value === 'inventory' ? found.inventorySource : found.manualSource}
                </button>
              )
            })}
          </div>

          {source === 'inventory' ? (
            <div className="space-y-3">
              <label className="relative block">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={found.searchPlaceholder}
                  className="w-full rounded-xl border border-border bg-card py-2.5 pr-3 pl-9 text-sm outline-none focus:border-accent"
                />
              </label>
              <select
                value={inventoryId}
                onChange={(event) => setInventoryId(event.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                <option value="">{found.selectPlaceholder}</option>
                {inventoryOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.price ?? found.priceOnRequest} {vehicle.currency}
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <VehicleReview
                  imageUrl={(selectedVehicle.photos.find((photo) => photo.isPrimary) ?? selectedVehicle.photos[0])?.url ?? null}
                  make={selectedVehicle.make}
                  model={selectedVehicle.model}
                  year={selectedVehicle.year}
                  price={selectedVehicle.price}
                  currency={selectedVehicle.currency}
                  fallback={t.vehicleImageUnavailable}
                  priceOnRequest={found.priceOnRequest}
                />
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="make" label={t.vehicle.make} value={manual.make} onChange={(event) => setManual((value) => ({ ...value, make: event.target.value }))} required />
              <Field name="model" label={t.vehicle.model} value={manual.model} onChange={(event) => setManual((value) => ({ ...value, model: event.target.value }))} required />
              <Field name="year" label={found.year} type="number" min="1900" max="2100" value={manual.year} onChange={(event) => setManual((value) => ({ ...value, year: event.target.value }))} required />
              <Field name="price" label={found.price} type="number" min="0" step="0.01" value={manual.price} onChange={(event) => setManual((value) => ({ ...value, price: event.target.value }))} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{found.currency}</span>
                <select name="currency" value={manual.currency} onChange={(event) => setManual((value) => ({ ...value, currency: event.target.value }))} required className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                  {['CAD', 'XOF', 'USD', 'EUR'].map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{found.photo}</span>
                <input
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    setManualPhotoPreview(file ? URL.createObjectURL(file) : null)
                  }}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-accent"
                />
              </label>
              {manualReady && (
                <div className="sm:col-span-2">
                  <VehicleReview
                    imageUrl={manualPhotoPreview}
                    make={manual.make}
                    model={manual.model}
                    year={Number(manual.year)}
                    price={manual.price ? Number(manual.price) : null}
                    currency={manual.currency}
                    fallback={t.vehicleImageUnavailable}
                    priceOnRequest={found.priceOnRequest}
                  />
                </div>
              )}
            </div>
          )}

          <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">{found.reviewNotice}</p>
        </form>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || status === currentStatus || !vehicleFoundReady}
        className={buttonClasses({ variant: 'primary', size: 'md', fullWidth: true, className: 'min-w-0 gap-2 px-3 sm:px-5' })}
      >
        <Send className="h-4 w-4" strokeWidth={2} />
        {pending ? t.statusUpdateSubmitting : status === 'vehicle_found' ? found.confirm : t.statusUpdateSubmit}
      </button>
      {feedback === 'success' && <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" />{t.statusUpdateSuccess}</p>}
      {feedback === 'error' && <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><AlertCircle className="h-4 w-4" />{t.statusUpdateError}</p>}
    </div>
  )
}

function Field({ name, label, ...props }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input name={name} {...props} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-accent" />
    </label>
  )
}

function VehicleReview(props: { imageUrl: string | null; make: string; model: string; year: number; price: number | null; currency: string; fallback: string; priceOnRequest: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
        <VehicleImage src={props.imageUrl} alt={`${props.make} ${props.model}`} className="h-full w-full object-cover" variant="placeholder" placeholderLabel={props.fallback} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{props.make} {props.model}</p>
        <p className="text-sm text-muted-foreground">{props.year}</p>
        <p className="mt-1 text-sm font-semibold text-accent">{props.price ?? props.priceOnRequest} {props.price === null ? '' : props.currency}</p>
      </div>
    </div>
  )
}

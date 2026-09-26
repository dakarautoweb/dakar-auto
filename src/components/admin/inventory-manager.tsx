'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ExternalLink, Star, Car, Gauge, Banknote, CalendarDays } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { AdminVehicle, VehicleStatus } from '@/src/services/inventory/types'
import { VEHICLE_STATUSES } from '@/src/services/inventory/types'
import { deleteVehicleAction, setVehicleFeaturedAction, setVehicleStatusAction } from '@/src/services/inventory/actions'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import { getBrandLogoPath } from '@/src/lib/brand-logos'
import { STATUS_DOT_CLASSES, STATUS_ICONS, STATUS_ICON_CHIP_CLASSES } from './status-badge'
import { StatusSelect } from './status-select'
import { ALL_STATUS_ICON, ALL_STATUS_CHIP_CLASS } from './filter-select-options'
import { InventoryDeleteModal } from './inventory-delete-modal'

function formatPrice(price: number | null, currency: string, locale: string): string {
  if (price === null) return '—'
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function VehicleRow({ dict, locale, vehicle, onDelete }: { dict: Dictionary; locale: string; vehicle: AdminVehicle; onDelete: () => void }) {
  const t = dict.admin.inventoryPage
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const thumb = vehicle.photos.find((p) => p.isPrimary)?.url ?? vehicle.photos[0]?.url ?? null

  function changeStatus(status: string) {
    startTransition(async () => {
      const result = await setVehicleStatusAction(vehicle.id, status)
      if (result.ok) router.refresh()
    })
  }

  function toggleFeatured() {
    startTransition(async () => {
      const result = await setVehicleFeaturedAction(vehicle.id, !vehicle.isFeatured)
      if (result.ok) router.refresh()
    })
  }

  const isPublic = vehicle.status === 'available' || vehicle.status === 'reserved'

  const logo = getBrandLogoPath(vehicle.make)
  const statusItem = (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[vehicle.status] ?? 'bg-muted-foreground/50'}`} />
      {t.statuses[vehicle.status]}
    </span>
  )

  // Left: large photo · center: bare brand logo + make/model/year lockup
  // beside the status select, then an icon spec row · right: equal-width
  // stacked actions. Spec icons are bare gold glyphs (no tiles); the status
  // keeps its semantic colored dot from STATUS_DOT_CLASSES.
  return (
    <div
      className={cardClasses({
        padding: 'none',
        className: 'group flex flex-col gap-4 overflow-hidden p-3 hover:border-accent-gold/35 sm:flex-row sm:items-center sm:gap-5 sm:p-4',
      })}
    >
      <div className="flex aspect-[16/9] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface sm:aspect-auto sm:h-24 sm:w-32">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage-hosted photo, not a static/optimizable asset
          <img src={thumb} alt="" className="h-full w-full object-cover object-center transition duration-500 ease-out group-hover:scale-[1.04]" />
        ) : (
          <Car className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3.5">
            {logo && (
              // Transparent logo, no capsule — deepened to graphite on light
              // so chrome logos stay legible, rendered as-is on dark.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-12 w-12 shrink-0 object-contain brightness-[0.55] contrast-[1.4] drop-shadow-sm sm:h-14 sm:w-14 dark:brightness-100 dark:contrast-100"
              />
            )}
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-accent-gold uppercase">{vehicle.make}</p>
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="truncate text-xl leading-tight font-bold tracking-tight text-foreground sm:text-2xl">{vehicle.model}</p>
                <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">{vehicle.year}</span>
                <button
                  type="button"
                  onClick={toggleFeatured}
                  disabled={pending}
                  aria-pressed={vehicle.isFeatured}
                  title={vehicle.isFeatured ? t.featuredOn : t.featuredOff}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full transition duration-200 ${vehicle.isFeatured ? 'text-accent-gold' : 'text-muted-foreground hover:text-accent-gold'}`}
                >
                  <Star className="h-4 w-4" strokeWidth={2} fill={vehicle.isFeatured ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </div>

          <select
            value={vehicle.status}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-border bg-surface-raised px-2.5 text-xs font-medium text-foreground transition duration-200 hover:border-accent-gold/40 focus:border-accent focus:outline-none disabled:opacity-60 sm:w-40"
          >
            {VEHICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t.statuses[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-sm font-medium text-foreground/85 tabular-nums">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Gauge className="h-4 w-4 shrink-0 text-accent-gold" strokeWidth={1.75} aria-hidden="true" />
            {vehicle.mileage !== null ? `${vehicle.mileage.toLocaleString(locale === 'fr' ? 'fr-CA' : 'en-CA')} km` : '—'}
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Banknote className="h-4 w-4 shrink-0 text-accent-gold" strokeWidth={1.75} aria-hidden="true" />
            {formatPrice(vehicle.price, vehicle.currency, locale)}
          </span>
          {statusItem}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0 text-accent-gold" strokeWidth={1.75} aria-hidden="true" />
            {formatDate(vehicle.createdAt, locale)}
          </span>
        </div>
      </div>

      {/* Always a vertical stack (full-width on mobile, one fixed width on
          desktop so all three match) — a horizontal row of three text+icon
          buttons here would overflow a narrow card and force horizontal
          scroll. */}
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-32 sm:border-l sm:border-border sm:pl-5">
        {isPublic && (
          <a
            href={`/vehicles/${vehicle.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'secondary-muted', size: 'sm', className: 'h-9 w-full justify-center gap-1.5' })}
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            {t.view}
          </a>
        )}
        <Link href={`/admin/vehicles/${vehicle.id}`} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'h-9 w-full justify-center gap-1.5' })}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          {t.edit}
        </Link>
        <button type="button" onClick={onDelete} className={buttonClasses({ variant: 'danger-muted', size: 'sm', className: 'h-9 w-full justify-center gap-1.5' })}>
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          {t.delete}
        </button>
      </div>
    </div>
  )
}

const STATUS_FILTERS = ['all', ...VEHICLE_STATUSES] as const

export function InventoryManager({ dict, locale, vehicles }: { dict: Dictionary; locale: string; vehicles: AdminVehicle[] }) {
  const t = dict.admin.inventoryPage
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [deleteTarget, setDeleteTarget] = useState<AdminVehicle | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filtered = statusFilter === 'all' ? vehicles : vehicles.filter((v) => v.status === statusFilter)

  function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteVehicleAction(deleteTarget.id)
      if (result.ok) {
        setDeleteTarget(null)
        router.refresh()
      } else {
        setDeleteError(t.errorDeleteFailed)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-64">
          <StatusSelect
            id="inventory-status-filter"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as (typeof STATUS_FILTERS)[number])}
            statuses={STATUS_FILTERS}
            labels={{ all: dict.admin.vehicleRequests.statusAll, ...t.statuses }}
            icons={{ all: ALL_STATUS_ICON, ...STATUS_ICONS }}
            chipClasses={{ all: ALL_STATUS_CHIP_CLASS, ...STATUS_ICON_CHIP_CLASSES }}
            ariaLabel={dict.admin.tableControls.filterStatusLabel}
          />
        </div>
        <Link href="/admin/vehicles/new" className={buttonClasses({ variant: 'primary', size: 'md', className: 'w-full justify-center gap-1.5 sm:w-auto' })}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          {t.addButton}
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className={cardClasses({ padding: 'lg', className: 'flex flex-col items-center gap-3 border-dashed text-center' })}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Car className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-muted-foreground">{t.empty}</p>
          <Link href="/admin/vehicles/new" className={buttonClasses({ variant: 'primary', size: 'sm', className: 'gap-1.5' })}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((vehicle) => (
            <VehicleRow key={vehicle.id} dict={dict} locale={locale} vehicle={vehicle} onDelete={() => setDeleteTarget(vehicle)} />
          ))}
        </div>
      )}

      {deleteTarget && (
        <InventoryDeleteModal
          dict={dict}
          vehicleLabel={`${deleteTarget.make} ${deleteTarget.model} · ${deleteTarget.year}`}
          pending={deletePending}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

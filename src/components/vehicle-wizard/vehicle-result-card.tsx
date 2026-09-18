'use client'

import { useState, type ReactElement } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { VehicleImage } from '@/src/components/vehicle-image'
import { monogramFor } from '@/src/components/home/brand-badge'
import {
  CheckCircleIcon,
  ResultEngineIcon,
  FuelIcon,
  ResultBodyIcon,
  ResultDrivetrainIcon,
  ResultTransmissionIcon,
  CalendarIcon,
  ArrowRightIcon,
  EditIcon,
  RefreshIcon,
  CopyIcon,
  CarSideIcon,
} from '@/src/components/home/icons'
import type { ConfirmedVehicle } from './types'

type IconFn = (props: { className?: string }) => ReactElement
type SpecEntry = { icon: IconFn; label: string; value: string }

const NOT_AVAILABLE = 'N/A'

// Known brand-name -> /public/brands/<slug>.png mismatches — same alias
// table as vehicle-result-card-parts.tsx's PartsBrandLogo. Kept as a
// separate, duplicated component (not shared) since the two cards are
// deliberately independent surfaces — this is the ONLY place a real brand
// logo is used for the /vehicle/identify wizard; the "Marques prises en
// charge" brand-wall section has its own separate data and is untouched.
const BRAND_ALIASES: Record<string, string> = {
  mercedes: 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  vw: 'volkswagen',
}

function brandLogoSlug(make: string): string {
  const normalized = make.trim().toLowerCase()
  return BRAND_ALIASES[normalized] ?? normalized.replace(/\s+/g, '-')
}

// Tries the real local logo first (public/brands/<slug>.png); a missing
// file quietly falls back to a monogram badge, never a broken image. A
// soft bordered square, never a circular capsule/badge.
function ResultBrandLogo({ make }: { make: string | null | undefined }) {
  const [errored, setErrored] = useState(false)
  const slug = make ? brandLogoSlug(make) : null
  const showLogo = Boolean(slug) && !errored
  const monogram = make ? monogramFor(make) : ''

  return (
    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent-soft p-2.5 sm:h-16 sm:w-16">
      {showLogo ? (
        // Many /public/brands/*.png files are chrome/silver marks (near-
        // white) designed to sit on a dark surface — invisible against this
        // card's light-theme background. Darkened only in light theme
        // (dark: resets it) since there's no separate dark-theme asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/brands/${slug}.png`}
          alt={make ?? ''}
          className="h-full w-full object-contain brightness-[0.4] contrast-125 dark:brightness-100 dark:contrast-100"
          onError={() => setErrored(true)}
        />
      ) : monogram ? (
        <span className="text-xl font-bold tracking-wide text-accent sm:text-2xl">{monogram}</span>
      ) : (
        <CarSideIcon className="h-8 w-8 text-accent" />
      )}
    </span>
  )
}

// Small clipboard affordance next to the VIN — copies the raw VIN string,
// nothing more; no decode/business logic involved.
function CopyVinButton({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(vin)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      }}
      aria-label="Copy VIN"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition duration-150 hover:text-accent"
    >
      {copied ? <CheckCircleIcon className="h-3.5 w-3.5 text-accent" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </button>
  )
}

// Real warehouse photo backdrop (approved assets: public/vehicle-result/
// vehicle-result-bg-{dark,light}.png) — both layers stay mounted and only
// opacity flips on the `dark` class, so the theme switch crossfades instead
// of snapping.
function WarehouseBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500 dark:opacity-0"
        style={{ backgroundImage: "url('/vehicle-result/vehicle-result-bg-light.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-100"
        style={{ backgroundImage: "url('/vehicle-result/vehicle-result-bg-dark.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
    </>
  )
}

// Identified-vehicle result card for the /vehicle/identify wizard's VIN
// step (homepage-entry flow only — see vin-step.tsx). Deliberately kept
// inside the page's own max-w-3xl column (same as every other wizard
// step), so it lines up directly under ProgressSteps instead of stretching
// wider than the stepper above it — same structural recipe as
// VehicleResultCardParts: header block, a fixed 3x2 spec grid, one row of
// three actions, and the vehicle photo grounded in its own panel below.
export function VehicleResultCard({
  vehicle,
  dict,
  onConfirm,
  onEditVin,
  onNotMine,
}: {
  vehicle: ConfirmedVehicle
  dict: Dictionary
  onConfirm: () => void
  onEditVin?: () => void
  onNotMine: () => void
}) {
  const t = dict.wizard.result

  // Always exactly 6 cells, in this fixed order — a field with no decoded
  // value shows "N/A" rather than being dropped, so the grid never
  // reflows to 5 (or fewer) cells and stays visually balanced.
  const specs: SpecEntry[] = [
    { icon: ResultEngineIcon, label: t.engineLabel, value: vehicle.engine || NOT_AVAILABLE },
    { icon: ResultBodyIcon, label: t.bodyStyleLabel, value: vehicle.bodyStyle || NOT_AVAILABLE },
    { icon: ResultDrivetrainIcon, label: t.drivetrainLabel, value: vehicle.drivetrain || NOT_AVAILABLE },
    { icon: ResultTransmissionIcon, label: t.transmissionLabel, value: vehicle.transmission || NOT_AVAILABLE },
    { icon: CalendarIcon, label: t.productionYearLabel, value: vehicle.year ? String(vehicle.year) : NOT_AVAILABLE },
    { icon: FuelIcon, label: t.fuelTypeLabel, value: vehicle.fuelType || NOT_AVAILABLE },
  ]

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')

  const actionButtonClass =
    'flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-semibold tracking-wide transition duration-200 sm:h-14'
  const secondaryButtonClass = `${actionButtonClass} border border-border bg-surface text-foreground hover:border-accent-hover hover:text-accent-hover hover:bg-accent-soft/50`

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <ResultBrandLogo make={vehicle.make} />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.28em] text-accent uppercase">
              <CheckCircleIcon className="h-4 w-4" />
              {t.title}
            </span>
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-balance sm:text-2xl md:text-3xl">{title}</h2>
            {vehicle.vin && (
              <div className="mt-1.5 flex items-center gap-2">
                <p className="font-mono text-xs font-light tracking-[0.2em] text-muted-foreground">
                  {t.vinLabel} : {vehicle.vin}
                </p>
                <CopyVinButton vin={vehicle.vin} />
              </div>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <div className="space-y-1 text-[0.6rem] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            {t.trustWords.map((word) => (
              <p key={word}>{word}</p>
            ))}
          </div>
          <div className="ml-auto mt-2 h-[2px] w-10 bg-accent" />
        </div>
      </div>

      {/* Spec grid — 3 columns x 2 rows, fixed order, one shared grid with
          internal dividers (not 6 separate cards) */}
      <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-3">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-center gap-2.5 p-4 sm:p-5">
            <spec.icon className="h-7 w-7 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{spec.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold sm:text-base">{spec.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* One horizontal action row, same width as the spec grid above */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <button type="button" onClick={onConfirm} className={`${actionButtonClass} bg-accent text-accent-foreground hover:bg-accent-hover`}>
          <span className="truncate">{t.confirm}</span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </button>
        {onEditVin && (
          <button type="button" onClick={onEditVin} className={secondaryButtonClass}>
            <EditIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.editVin}</span>
          </button>
        )}
        <button type="button" onClick={onNotMine} className={secondaryButtonClass}>
          <RefreshIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t.notMine}</span>
        </button>
      </div>

      {/* Vehicle photo, grounded on the approved warehouse backdrop, as its
          own block below the info panel — not a side panel. */}
      <div className="relative mt-5 h-64 overflow-hidden rounded-2xl border border-border sm:h-80">
        <WarehouseBackdrop />

        <div className="absolute inset-x-6 top-6 bottom-2 sm:inset-x-10">
          <div className="absolute inset-x-[10%] bottom-[3%] h-6 rounded-[50%] bg-black/35 blur-xl" />
          <VehicleImage
            src={vehicle.imageUrl}
            showReflection
            className="relative h-full w-full object-contain drop-shadow-2xl"
            fallbackClassName="relative h-full w-full object-contain drop-shadow-2xl"
          />
        </div>

        {vehicle.model && (
          <div className="absolute right-4 bottom-3 text-right sm:right-6">
            <p className="text-sm font-bold tracking-[0.12em] text-black/70 sm:text-base dark:text-white/90">{vehicle.model}</p>
            {vehicle.year && (
              <>
                <div className="ml-auto mt-1 h-[2px] w-8 bg-accent" />
                <p className="mt-1 text-xs tracking-[0.3em] text-black/40 uppercase dark:text-white/50">{vehicle.year}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

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
  MakeIcon,
} from '@/src/components/home/icons'
import type { ConfirmedVehicle } from './types'

const NOT_AVAILABLE = 'N/A'

// Same brand-name -> /public/brands/<slug>.png alias table as
// vehicle-result-card.tsx's ResultBrandLogo — duplicated rather than
// shared, per that file's own note: these are deliberately independent
// surfaces (this one only ever renders for entrySource === 'parts').
const BRAND_ALIASES: Record<string, string> = {
  mercedes: 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  vw: 'volkswagen',
}

function brandLogoSlug(make: string): string {
  const normalized = make.trim().toLowerCase()
  return BRAND_ALIASES[normalized] ?? normalized.replace(/\s+/g, '-')
}

// A soft bordered square, never a circular capsule/badge — same recipe as
// vehicle-result-card.tsx's ResultBrandLogo.
function PartsBrandLogo({ make }: { make: string | null | undefined }) {
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
        <span className="text-xl font-bold tracking-wide text-accent">{monogram}</span>
      ) : (
        <MakeIcon className="h-7 w-7 text-accent" />
      )}
    </span>
  )
}

// Small clipboard affordance next to the VIN — copies the raw VIN string,
// nothing more; no decode/business logic involved. Duplicated from
// vehicle-result-card.tsx per this file's own convention (see header note).
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
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-black/35 transition duration-150 hover:text-accent dark:text-white/35 dark:hover:text-accent"
    >
      {copied ? <CheckCircleIcon className="h-3.5 w-3.5 text-accent" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </button>
  )
}

type IconFn = (props: { className?: string }) => ReactElement
type SpecEntry = { icon: IconFn; label: string; value: string }

// Dedicated Pièces-entry result card (entrySource === 'parts' only — see
// vin-step.tsx's CardComponent branch). Deliberately its own component,
// not a variant of VehicleResultCard: dark-mode-only premium single card
// (brand logo + status top-left, spec grid, one action row, vehicle image
// beneath) rather than that card's theme-reactive split two-panel layout.
// Never rendered for entrySource 'homepage' or null.
export function VehicleResultCardParts({
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

  const specs: SpecEntry[] = [
    { icon: ResultEngineIcon, label: t.engineLabel, value: vehicle.engine || NOT_AVAILABLE },
    { icon: ResultBodyIcon, label: t.bodyStyleLabel, value: vehicle.bodyStyle || NOT_AVAILABLE },
    { icon: ResultDrivetrainIcon, label: t.drivetrainLabel, value: vehicle.drivetrain || NOT_AVAILABLE },
    { icon: ResultTransmissionIcon, label: t.transmissionLabel, value: vehicle.transmission || NOT_AVAILABLE },
    { icon: CalendarIcon, label: t.productionYearLabel, value: vehicle.year ? String(vehicle.year) : NOT_AVAILABLE },
    { icon: FuelIcon, label: t.fuelTypeLabel, value: vehicle.fuelType || NOT_AVAILABLE },
  ]

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')

  return (
    // Deliberately NOT a full-viewport breakout — this card stays inside
    // the page's own max-w-3xl column (same as every other wizard step),
    // so it lines up directly under ProgressSteps instead of stretching
    // wider than the stepper above it. Theme-reactive (light: warm ivory
    // surface, dark: premium graphite) via the same dark: convention as
    // vehicle-result-card.tsx.
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-b from-[#fefefe] to-[#f5f3ee] p-5 text-[#221d16] shadow-lg sm:p-7 dark:border-white/10 dark:from-[#1c1d22] dark:to-[#17181b] dark:text-white">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <PartsBrandLogo make={vehicle.make} />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.28em] text-accent uppercase">
              <CheckCircleIcon className="h-4 w-4" />
              {t.title}
            </span>
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-balance sm:text-2xl md:text-3xl">{title}</h2>
            {vehicle.vin && (
              <div className="mt-1.5 flex items-center gap-2">
                <p className="font-mono text-xs font-light tracking-[0.2em] text-black/45 dark:text-white/45">
                  {t.vinLabel} : {vehicle.vin}
                </p>
                <CopyVinButton vin={vehicle.vin} />
              </div>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <div className="space-y-1 text-[0.6rem] font-semibold tracking-[0.3em] text-black/40 uppercase dark:text-white/40">
            {t.trustWords.map((word) => (
              <p key={word}>{word}</p>
            ))}
          </div>
          <div className="ml-auto mt-2 h-[2px] w-10 bg-accent" />
        </div>
      </div>

      {/* Spec grid — 3 columns x 2 rows, fixed order, one shared grid with
          internal dividers (not 6 separate cards) */}
      <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] sm:grid-cols-3 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.035]">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-center gap-2.5 p-4 sm:p-5">
            <spec.icon className="h-7 w-7 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold tracking-[0.1em] text-black/45 uppercase dark:text-white/45">{spec.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-[#221d16] sm:text-base dark:text-white">{spec.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* One horizontal action row, same width as the spec grid above */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={onConfirm}
          className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-2 text-[13px] font-semibold tracking-wide text-accent-foreground transition duration-200 hover:bg-accent-hover"
        >
          <span className="truncate">{t.confirm}</span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" />
        </button>
        {onEditVin && (
          <button
            type="button"
            onClick={onEditVin}
            className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-black/5 px-2 text-[13px] font-semibold tracking-wide text-[#221d16] transition duration-200 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <EditIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.editVin}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onNotMine}
          className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-black/5 px-2 text-[13px] font-semibold tracking-wide text-[#221d16] transition duration-200 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          <RefreshIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t.notMine}</span>
        </button>
      </div>

      {/* Vehicle image, grounded with a soft contact shadow — a touch
          lighter and warmer than the info panel above in both themes,
          never pitch black. */}
      <div className="relative mt-5 h-52 overflow-hidden rounded-2xl bg-[#f0ede6] sm:h-64 dark:bg-[#1f2025]">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 60% 30%, rgba(194,110,45,0.14), transparent 65%)' }}
        />
        <div className="absolute inset-x-[15%] bottom-[8%] h-5 rounded-[50%] bg-black/25 blur-xl dark:bg-black/40" />
        <VehicleImage
          src={vehicle.imageUrl}
          showReflection
          className="relative h-full w-full object-contain drop-shadow-2xl"
          fallbackClassName="relative h-full w-full object-contain drop-shadow-2xl"
        />

        {vehicle.model && (
          <div className="absolute right-4 bottom-3 text-right sm:right-5">
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

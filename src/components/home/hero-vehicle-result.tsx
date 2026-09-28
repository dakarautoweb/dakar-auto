'use client'

import { useState, type ReactElement } from 'react'
import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VehicleResult } from '@/src/services/vin/types'
import { VehicleImage } from '@/src/components/vehicle-image'
import { usePartRequestWizard } from '@/src/components/vehicle-wizard/wizard-context'
import { vehicleResultToConfirmed } from '@/src/components/vehicle-wizard/types'
import { monogramFor } from './brand-badge'
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
  MakeIcon,
} from './icons'

type IconFn = (props: { className?: string }) => ReactElement
type SpecEntry = { icon: IconFn; label: string; value: string }

const NOT_AVAILABLE = 'N/A'

// Known brand-name -> /public/brands/<slug>.png mismatches, so the make
// string decoded from a VIN ("Mercedes-Benz", "Mercedes Benz", "VW", ...)
// still resolves to the one file we actually have. Add more aliases here
// as new logo files are dropped into public/brands/ — the default
// (lowercase, spaces -> hyphens) already covers most makes without needing
// an entry (toyota, honda, bmw, ford, hyundai, kia, mazda, nissan,
// peugeot, volkswagen, audi, and future ones like acura/renault/volvo/
// lexus/chevrolet all slugify correctly on their own).
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
// file (any make not yet covered — see BRAND_ALIASES above) quietly falls
// back to the same monogram/generic-mark treatment as BrandBadge, never a
// broken image. Kept separate from BrandBadge itself (used by the
// /vehicle/identify wizard's result card) so that card's appearance is
// unaffected by this change.
function HeroBrandLogo({ make }: { make: string | null | undefined }) {
  const [errored, setErrored] = useState(false)
  const slug = make ? brandLogoSlug(make) : null
  const showLogo = Boolean(slug) && !errored
  const monogram = make ? monogramFor(make) : ''

  return (
    <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-black/5 p-3 dark:bg-white/5">
      {showLogo ? (
        // Many /public/brands/*.png files are chrome/silver marks (near-
        // white) designed to sit on a dark surface — invisible against this
        // panel's light-theme background. Darkened only in light theme
        // (dark: resets it) since there's no separate dark-theme asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/brands/${slug}.png`}
          alt={make ?? ''}
          className="h-full w-full object-contain brightness-[0.4] contrast-125 dark:brightness-100 dark:contrast-100"
          onError={() => setErrored(true)}
        />
      ) : monogram ? (
        <span className="text-2xl font-bold tracking-wide text-accent">{monogram}</span>
      ) : (
        <MakeIcon className="h-9 w-9 text-accent" />
      )}
    </span>
  )
}

// Clean, photo-free studio backdrop for the result card's right side — no
// warehouse photo, no baked-in text/logo. Both layers stay mounted and only
// opacity flips on the `dark` class (same crossfade pattern used elsewhere
// in this file/HeroBackdrop), so toggling the theme fades between them
// instead of snapping.
//   - Light: the original ivory studio treatment (soft wall, reflective
//     floor, one diagonal light strip).
//   - Dark: intentionally simpler per the approved spec — just a smooth
//     charcoal/graphite gradient, a shade lighter than the left panel's
//     dark surface so the two sides stay visually distinct.
function StudioBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 opacity-100 transition-opacity duration-500 dark:opacity-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f4f1ea] via-[#e7e2d7] to-[#cec8ba]" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-[#b7b0a0] to-[#948c7c]" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-white/30 via-white/5 to-transparent" />
        <div className="absolute -top-1/4 left-[28%] h-[160%] w-[22%] rotate-[15deg] bg-gradient-to-r from-transparent via-white/70 to-transparent blur-3xl" />
        <div className="absolute -top-1/4 left-[35%] h-[160%] w-[4%] rotate-[15deg] bg-white/70 blur-xl" />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[#242730] via-[#1a1c22] to-[#111217] opacity-0 transition-opacity duration-500 dark:opacity-100"
      />
    </>
  )
}

// Wide horizontal result card for the homepage hero's post-VIN-lookup
// state (see hero.tsx) — its own component, not shared with the
// /vehicle/identify wizard's VehicleResultCard: same kind of data,
// different context. Left = premium info panel (real brand logo + name,
// approved-status row, title, VIN, a fixed 2x3 spec grid, one shared
// action panel) that flips between a rich dark-charcoal surface and a
// light ivory surface with the app's own dark-mode toggle (`dark:`
// variants below — not the app-wide --header-bg token, which is
// deliberately theme-fixed for the site header/logo and would keep this
// panel dark in light mode). Right = a clean, photo-free studio backdrop
// (see StudioBackdrop) with the vehicle image grounded on top of it.
export function HeroVehicleResult({
  vehicle,
  dict,
  onEditVin,
  onReset,
}: {
  vehicle: VehicleResult
  dict: Dictionary
  onEditVin: () => void
  onReset: () => void
}) {
  const t = dict.wizard.result
  const wizard = usePartRequestWizard()

  // Always exactly 6 cells, in this fixed order — a field with no decoded
  // value shows "N/A" rather than being dropped, so the grid never
  // reflows to 5 (or fewer) cells and stays visually balanced. Row-major
  // fill over 2 columns puts engine/bodyStyle/transmission on the left and
  // fuelType/drivetrain/year on the right.
  const specs: SpecEntry[] = [
    { icon: ResultEngineIcon, label: t.engineLabel, value: vehicle.engine || NOT_AVAILABLE },
    { icon: FuelIcon, label: t.fuelTypeLabel, value: vehicle.fuelType || NOT_AVAILABLE },
    { icon: ResultBodyIcon, label: t.bodyStyleLabel, value: vehicle.bodyStyle || NOT_AVAILABLE },
    { icon: ResultDrivetrainIcon, label: t.drivetrainLabel, value: vehicle.drivetrain || NOT_AVAILABLE },
    { icon: ResultTransmissionIcon, label: t.transmissionLabel, value: vehicle.transmission || NOT_AVAILABLE },
    { icon: CalendarIcon, label: t.productionYearLabel, value: vehicle.year ? String(vehicle.year) : NOT_AVAILABLE },
  ]

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')

  const secondaryActionClass =
    'flex flex-1 items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold tracking-wide text-[#221d16] transition duration-200 hover:bg-black/10 dark:text-white dark:hover:bg-white/10'

  return (
    <div className="animate-[fade-in_250ms_ease-out] overflow-hidden rounded-3xl border border-border shadow-card">
      <div className="grid md:grid-cols-2">
        {/* Left — premium info panel, theme-reactive (see component note) */}
        <div className="relative z-10 flex flex-col gap-6 bg-gradient-to-br from-[#fbfaf7] to-[#f1ede2] p-6 text-[#221d16] dark:from-[#1b1d24] dark:to-[#0c0d10] dark:text-white sm:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-3.5">
                <HeroBrandLogo make={vehicle.make} />
                {vehicle.make && <span className="text-xl font-extrabold tracking-wide uppercase">{vehicle.make}</span>}
              </div>
              <span className="hidden h-10 w-px bg-black/15 sm:block dark:bg-white/15" />
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.28em] text-accent uppercase">
                <CheckCircleIcon className="h-4 w-4" />
                {t.title}
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h2>

            {vehicle.vin && (
              <p className="mt-2 font-mono text-sm font-light tracking-[0.28em] text-black/45 dark:text-white/45">
                {t.vinLabel}: {vehicle.vin}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center gap-3 p-4">
                  <spec.icon className="h-7 w-7 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-black/45 uppercase dark:text-white/45">{spec.label}</p>
                    <p className="mt-0.5 truncate text-[0.95rem] font-bold">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* One shared segmented panel — same width as the spec grid
              above, vertical dividers instead of gaps between the three
              actions, primary segment in accent orange. Stacks only on
              the narrowest screens (see sm:flex-row below). */}
          <div className="flex flex-col divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-white/10 dark:border-white/10">
            {/* Vehicle was already identified right here on the homepage —
                confirming it into the shared wizard context (instead of
                re-passing the VIN as a query string) lets /vehicle/identify
                skip straight to category selection instead of asking the
                user to re-enter/re-decode the VIN it already has. */}
            <Link
              href="/vehicle/identify"
              onClick={() => wizard.confirmVehicleFromHomepage(vehicleResultToConfirmed(vehicle))}
              className="flex flex-1 items-center justify-center gap-2 bg-accent px-5 py-3.5 text-sm font-semibold tracking-wide text-accent-foreground transition duration-200 hover:bg-accent-hover"
            >
              {t.confirmShort}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <button type="button" onClick={onEditVin} className={secondaryActionClass}>
              <EditIcon className="h-4 w-4" />
              {t.editVin}
            </button>
            <button type="button" onClick={onReset} className={secondaryActionClass}>
              <RefreshIcon className="h-4 w-4" />
              {t.notMine}
            </button>
          </div>
        </div>

        {/* Right — clean studio backdrop with the large identified vehicle
            grounded on the floor, a soft contact shadow, and the two text
            overlays. No warehouse, no baked-in text/logo. */}
        <div className="relative min-h-[16rem] overflow-hidden md:min-h-[22rem]">
          <StudioBackdrop />

          <div className="absolute inset-x-4 top-14 bottom-2 sm:inset-x-8 sm:top-16">
            <div className="absolute inset-x-[10%] bottom-[3%] h-6 rounded-[50%] bg-black/30 blur-xl" />
            <VehicleImage
              src={vehicle.imageUrl}
              showReflection
              className="relative h-full w-full object-contain drop-shadow-2xl"
              fallbackClassName="relative h-full w-full object-contain drop-shadow-2xl"
            />
          </div>

          <div className="absolute top-6 right-6 text-right sm:top-8 sm:right-8">
            <div aria-hidden="true" className="space-y-0.5 text-[0.65rem] font-semibold tracking-[0.3em] text-black/40 uppercase dark:text-white/70">
              {t.trustWords.map((word) => (
                <p key={word}>{word}</p>
              ))}
            </div>
            <div className="ml-auto mt-2 h-[2px] w-10 bg-accent" />
          </div>

          {vehicle.model && (
            <div className="absolute right-6 bottom-3 text-right sm:right-8">
              <p className="text-lg font-bold tracking-[0.35em] text-black/70 uppercase dark:text-white/90">{vehicle.model}</p>
              {vehicle.year && <p className="text-xs tracking-[0.35em] text-black/40 uppercase dark:text-white/55">{vehicle.year}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { VEHICLE_ENGINES, getModelsForMake, getVehicleYears } from '@/src/services/vehicle-data/demo-data'
import { OTHER_BRAND_VALUE, VEHICLE_BRANDS, brandLogoSrc, findBrandByName } from '@/src/lib/vehicle-brands'
import { buttonClasses, cardClasses, inputClass as selectClass } from '@/src/components/ui/styles'
import { EngineSpecIcon, InfoIcon, MakeIcon, ModelIcon, YearIcon } from '@/src/components/ui/dakar-icons'
import { BrandSelect } from './brand-select'
import type { ConfirmedVehicle, PartialVinMatch } from './types'

// Small, muted icon ahead of a field's label — soft/decorative only (never
// the sole cue for what the field is), matching the same thin currentColor
// icon style used everywhere else in the wizard (CalendarIcon in
// ReviewStep, etc.) rather than a bold/boxed icon. 16px (micro scale) —
// the car glyphs need that much room to stay legible.
function FieldLabel({ htmlFor, icon, children }: { htmlFor: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      {children}
    </label>
  )
}

// Read-only stand-in for BrandSelect when the make came from a partial VIN
// decode. A readOnly input (rather than a disabled control) keeps it fully
// legible, focusable, and announced as read-only, with its <label> intact.
function LockedMake({ id, make, hint }: { id: string; make: string; hint: string }) {
  const brand = findBrandByName(make)
  const hintId = `${id}-hint`
  return (
    <>
      <div className="relative">
        {brand && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoSrc(brand.slug)}
            alt=""
            className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 object-contain brightness-[0.4] contrast-125 dark:brightness-100 dark:contrast-100"
          />
        )}
        <input id={id} type="text" readOnly value={make} aria-describedby={hintId} className={`${selectClass} cursor-default ${brand ? 'pl-11' : ''}`} />
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
        {hint}
      </p>
    </>
  )
}

export function ManualVehicleForm({
  dict,
  initialValue,
  partialMatch,
  onConfirm,
  onBackToVin,
}: {
  dict: Dictionary
  // Re-populates the form when the user navigates back to it after already
  // confirming a manual vehicle (Part step's "Back", or Review's "Edit") —
  // without this, the shared make/model/year the user already picked would
  // be silently dropped and they'd have to re-enter everything.
  initialValue?: ConfirmedVehicle | null
  // Set when a VIN decode only identified the make (see VinStep). Its make
  // is pre-filled and locked — it came from the VIN itself, so the customer
  // only fills in what the decode couldn't — and its VIN is carried onto
  // the confirmed vehicle so the request still records it.
  partialMatch?: PartialVinMatch | null
  onConfirm: (vehicle: ConfirmedVehicle) => void
  onBackToVin?: () => void
}) {
  const years = useMemo(() => getVehicleYears(), [])

  // A partial match's make wins over any earlier value: it's locked below,
  // so it must always be the one actually submitted. Canonicalized to our
  // own brand spelling so the matching logo/model list is used.
  const lockedMake = partialMatch ? (findBrandByName(partialMatch.make)?.name ?? partialMatch.make) : null
  const initialMake = lockedMake ?? initialValue?.make ?? ''
  const isKnownInitialBrand = useMemo(() => VEHICLE_BRANDS.some((brand) => brand.name === initialMake), [initialMake])

  const initialYear = initialValue?.year ?? partialMatch?.year ?? null
  const [year, setYear] = useState(initialYear ? String(initialYear) : '')
  // `makeSelection` is either a known brand's display name, OTHER_BRAND_VALUE,
  // or '' — the BrandSelect's own controlled value. `customMake` only
  // matters while OTHER_BRAND_VALUE is selected; the effective `make` below
  // substitutes it in, so callers (isValid, onConfirm) never see the
  // sentinel.
  const [makeSelection, setMakeSelection] = useState(() => (!initialMake ? '' : isKnownInitialBrand ? initialMake : OTHER_BRAND_VALUE))
  const [customMake, setCustomMake] = useState(() => (initialMake && !isKnownInitialBrand ? initialMake : ''))
  const [model, setModel] = useState(initialValue?.model ?? '')
  const [engine, setEngine] = useState(initialValue?.engine ?? '')

  const make = makeSelection === OTHER_BRAND_VALUE ? customMake.trim() : makeSelection
  const models = make ? getModelsForMake(make) : []
  const isValid = year !== '' && make !== '' && model !== ''

  function handleBrandChange(next: string) {
    setMakeSelection(next)
    // A brand change invalidates whatever model was picked for the
    // previous one — refining the free-text "Other" spelling (which never
    // calls this) must not do the same, or it'd wipe a model the user is
    // still typing.
    setModel('')
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isValid) return
    onConfirm({
      source: 'manual',
      identificationSource: null,
      vin: partialMatch?.vin ?? null,
      year: Number(year),
      make,
      model,
      trim: null,
      engine: engine || null,
      transmission: null,
      bodyStyle: null,
      fuelType: null,
      drivetrain: null,
      imageUrl: null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cardClasses()}>
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.manual.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.manual.description}</p>

      {partialMatch && (
        // Informational, not an error: the VIN lookup worked, it just
        // couldn't provide every detail.
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <InfoIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{dict.wizard.vin.partialTitle}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{dict.wizard.vin.partialDescription}</p>
            <p className="mt-2 truncate font-mono text-xs tracking-wider text-muted-foreground">
              {dict.wizard.result.vinLabel} : {partialMatch.vin}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="manual-year" icon={<YearIcon className="h-4 w-4" />}>
            {dict.wizard.manual.yearLabel}
          </FieldLabel>
          <select id="manual-year" value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
            <option value="">{dict.wizard.manual.yearPlaceholder}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="manual-make" icon={<MakeIcon className="h-4 w-4" />}>
            {dict.wizard.manual.makeLabel}
          </FieldLabel>
          {lockedMake ? (
            <LockedMake id="manual-make" make={lockedMake} hint={dict.wizard.manual.makeFromVin} />
          ) : (
            <BrandSelect id="manual-make" dict={dict} value={makeSelection} onChange={handleBrandChange} />
          )}
          {!lockedMake && makeSelection === OTHER_BRAND_VALUE && (
            <div className="mt-2.5 animate-[fade-in_150ms_ease-out]">
              <label htmlFor="manual-make-custom" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {dict.wizard.manual.customMakeLabel}
              </label>
              <input
                id="manual-make-custom"
                type="text"
                value={customMake}
                onChange={(e) => setCustomMake(e.target.value)}
                placeholder={dict.wizard.manual.customMakePlaceholder}
                className={selectClass}
              />
            </div>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="manual-model" icon={<ModelIcon className="h-4 w-4" />}>
            {dict.wizard.manual.modelLabel}
          </FieldLabel>
          {models.length > 0 || make === '' ? (
            <select id="manual-model" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make} className={selectClass}>
              <option value="">{dict.wizard.manual.modelPlaceholder}</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            // No demo model list for this make (any brand outside the
            // original 12) — a free-text field instead of a dropdown with
            // nothing in it, so Model stays fillable for every brand.
            <input
              id="manual-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!make}
              placeholder={dict.wizard.manual.modelManualPlaceholder}
              className={selectClass}
            />
          )}
        </div>

        <div>
          <FieldLabel htmlFor="manual-engine" icon={<EngineSpecIcon className="h-4 w-4" />}>
            {dict.wizard.manual.engineLabel}
          </FieldLabel>
          <select id="manual-engine" value={engine} onChange={(e) => setEngine(e.target.value)} className={selectClass}>
            <option value="">{dict.wizard.manual.enginePlaceholder}</option>
            {VEHICLE_ENGINES.map((eng) => (
              <option key={eng} value={eng}>
                {eng}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={!isValid} className={buttonClasses({ variant: 'primary' })}>
          {dict.wizard.manual.confirm}
        </button>
        {onBackToVin && (
          <button type="button" onClick={onBackToVin} className={buttonClasses({ variant: 'secondary-muted' })}>
            {dict.wizard.manual.backToVin}
          </button>
        )}
      </div>
    </form>
  )
}

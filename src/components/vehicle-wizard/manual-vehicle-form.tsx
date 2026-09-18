'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { VEHICLE_ENGINES, getModelsForMake, getVehicleYears } from '@/src/services/vehicle-data/demo-data'
import { OTHER_BRAND_VALUE, VEHICLE_BRANDS } from '@/src/lib/vehicle-brands'
import { buttonClasses, cardClasses, inputClass as selectClass } from '@/src/components/ui/styles'
import { CalendarIcon, EngineIcon, HashIcon, PriceTagIcon } from '@/src/components/home/icons'
import { BrandSelect } from './brand-select'
import type { ConfirmedVehicle } from './types'

// Small, muted icon ahead of a field's label — soft/decorative only (never
// the sole cue for what the field is), matching the same thin currentColor
// icon style used everywhere else in the wizard (CalendarIcon in
// ReviewStep, etc.) rather than a bold/boxed icon.
function FieldLabel({ htmlFor, icon, children }: { htmlFor: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      {children}
    </label>
  )
}

export function ManualVehicleForm({
  dict,
  initialValue,
  onConfirm,
  onBackToVin,
}: {
  dict: Dictionary
  // Re-populates the form when the user navigates back to it after already
  // confirming a manual vehicle (Part step's "Back", or Review's "Edit") —
  // without this, the shared make/model/year the user already picked would
  // be silently dropped and they'd have to re-enter everything.
  initialValue?: ConfirmedVehicle | null
  onConfirm: (vehicle: ConfirmedVehicle) => void
  onBackToVin?: () => void
}) {
  const years = useMemo(() => getVehicleYears(), [])

  const initialMake = initialValue?.make ?? ''
  const isKnownInitialBrand = useMemo(() => VEHICLE_BRANDS.some((brand) => brand.name === initialMake), [initialMake])

  const [year, setYear] = useState(initialValue?.year ? String(initialValue.year) : '')
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
      vin: null,
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="manual-year" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
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
          <FieldLabel htmlFor="manual-make" icon={<PriceTagIcon className="h-3.5 w-3.5" />}>
            {dict.wizard.manual.makeLabel}
          </FieldLabel>
          <BrandSelect id="manual-make" dict={dict} value={makeSelection} onChange={handleBrandChange} />
          {makeSelection === OTHER_BRAND_VALUE && (
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
          <FieldLabel htmlFor="manual-model" icon={<HashIcon className="h-3.5 w-3.5" />}>
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
          <FieldLabel htmlFor="manual-engine" icon={<EngineIcon className="h-3.5 w-3.5" />}>
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

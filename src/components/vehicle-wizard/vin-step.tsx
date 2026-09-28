'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { identifyVinAction } from '@/src/services/vin/actions'
import { normalizeVin, validateVin } from '@/src/lib/vin'
import { DEMO_VINS } from '@/src/services/vin/demo-vins'
import type { VinLookupResult } from '@/src/services/vin/types'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import { ScanIcon, SearchIcon, SlidersIcon, VehicleSearchIcon } from '@/src/components/home/icons'
import { partialResultToMatch, vehicleResultToConfirmed, type ConfirmedVehicle, type PartialVinMatch } from './types'
import { VehicleResultCard } from './vehicle-result-card'
import { VehicleResultCardParts } from './vehicle-result-card-parts'
import type { WizardEntrySource } from './wizard-context'

export function VinStep({
  dict,
  initialVin,
  autoLookup = true,
  scannedVin,
  entrySource,
  onVehicleConfirmed,
  onPartialMatch,
  onManual,
  onScan,
}: {
  dict: Dictionary
  initialVin?: string
  // False when initialVin is only there to re-populate the field (coming
  // back from a partial match's manual form) — re-running the lookup would
  // just bounce the customer straight back to that form.
  autoLookup?: boolean
  scannedVin?: string | null
  // Only 'parts' (Pièces entry) gets the dedicated dark result card below —
  // every other case (homepage, direct visit) keeps the existing card.
  entrySource?: WizardEntrySource | null
  onVehicleConfirmed: (vehicle: ConfirmedVehicle) => void
  // A decode that only identified the make: the wizard moves on to manual
  // selection with that make pre-filled instead of showing a result here.
  onPartialMatch: (match: PartialVinMatch) => void
  onManual: () => void
  onScan: () => void
}) {
  const [vin, setVin] = useState(initialVin ? normalizeVin(initialVin) : '')
  const [result, setResult] = useState<VinLookupResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const autoSubmitted = useRef(false)
  const [appliedScannedVin, setAppliedScannedVin] = useState<string | null | undefined>(scannedVin)

  // A scan populates the field for review — it never auto-submits. The
  // user still has to press "Identify Vehicle" themselves, same as typing
  // it by hand. Adjusting state during render (rather than in an effect)
  // is React's own recommended pattern for "sync local state to a changed
  // prop" — see https://react.dev/learn/you-might-not-need-an-effect.
  if (scannedVin && scannedVin !== appliedScannedVin) {
    setAppliedScannedVin(scannedVin)
    setVin(normalizeVin(scannedVin))
    setResult(null)
  }

  function runLookup(value: string) {
    startTransition(async () => {
      const lookup = await identifyVinAction(value)
      if (lookup.status === 'partial') {
        onPartialMatch(partialResultToMatch(lookup.vehicle))
        return
      }
      setResult(lookup)
    })
  }

  useEffect(() => {
    if (!initialVin || !autoLookup || autoSubmitted.current) return
    autoSubmitted.current = true
    const normalized = normalizeVin(initialVin)
    if (validateVin(normalized) === null) {
      runLookup(normalized)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVin])

  const validationError = vin.length > 0 ? validateVin(vin) : null
  const canSubmit = vin.length === 17 && validationError === null && !isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    runLookup(vin)
  }

  if (result?.status === 'found') {
    const confirmed = vehicleResultToConfirmed(result.vehicle)
    // 'homepage' is the only case that keeps the split-panel default card
    // (it's reached here only via a later "Modifier le VIN" on a vehicle
    // that was originally confirmed from the homepage hero). Every other
    // way of landing on this step without a homepage-confirmed vehicle —
    // the Pièces subcategory flow, a bare category-tile click, or a
    // direct/fresh visit — gets the Pièces-entry card.
    const CardComponent = entrySource === 'homepage' ? VehicleResultCard : VehicleResultCardParts
    return (
      <CardComponent
        vehicle={confirmed}
        dict={dict}
        onConfirm={() => onVehicleConfirmed(confirmed)}
        onEditVin={() => setResult(null)}
        onNotMine={onManual}
      />
    )
  }

  return (
    <div className={cardClasses()}>
      <div className="flex items-center gap-4">
        <VehicleSearchIcon className="h-11 w-11 shrink-0 text-accent [stroke-width:1.5]" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">{dict.wizard.vin.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{dict.wizard.vin.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <label htmlFor="wizard-vin" className="mb-2 block text-sm font-medium text-muted-foreground">
          {dict.hero.vinLabel}
        </label>
        <input
          id="wizard-vin"
          value={vin}
          onChange={(event) => {
            setVin(normalizeVin(event.target.value).slice(0, 17))
            setResult(null)
          }}
          maxLength={17}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={dict.hero.vinPlaceholder}
          className="w-full rounded-xl border border-border bg-surface px-4 py-4 font-mono text-foreground uppercase tracking-widest shadow-sm transition duration-200 placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-4 focus:ring-accent/20"
        />

        {validationError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {validationError === 'length' ? dict.wizard.vin.errorLength : dict.wizard.vin.errorCharacters}
          </p>
        )}

        {(result?.status === 'not_found' || result?.status === 'unavailable') && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <p className="font-medium">
              {result.status === 'not_found' ? dict.wizard.vin.notFoundTitle : dict.wizard.vin.unavailableTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.status === 'not_found' ? dict.wizard.vin.notFoundDescription : dict.wizard.vin.unavailableDescription}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => canSubmit && runLookup(vin)}
                disabled={!canSubmit}
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                {dict.wizard.vin.retry}
              </button>
              <button type="button" onClick={onManual} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                {dict.wizard.vin.manualCta}
              </button>
            </div>
          </div>
        )}
        {result?.status === 'invalid' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {result.reason === 'length' ? dict.wizard.vin.errorLength : dict.wizard.vin.errorCharacters}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-14 min-w-0 items-center justify-center gap-1.5 bg-accent px-1.5 text-[13px] font-semibold text-accent-foreground transition duration-200 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
          >
            <SearchIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{isPending ? dict.wizard.vin.loading : dict.wizard.vin.submit}</span>
          </button>
          <button
            type="button"
            onClick={onScan}
            className="flex h-14 min-w-0 items-center justify-center gap-1.5 bg-transparent px-1.5 text-[13px] font-medium text-foreground transition duration-200 hover:bg-accent-soft/50 hover:text-accent-hover"
          >
            <ScanIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{dict.hero.secondaryCta}</span>
          </button>
          <button
            type="button"
            onClick={onManual}
            className="flex h-14 min-w-0 items-center justify-center gap-1.5 bg-transparent px-1.5 text-[13px] font-medium text-muted-foreground transition duration-200 hover:bg-accent-soft/50 hover:text-accent-hover"
          >
            <SlidersIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{dict.wizard.vin.manualCta}</span>
          </button>
        </div>
      </form>

      <details className="group mt-6">
        <summary className="cursor-pointer list-none text-sm font-medium text-accent underline-offset-4 marker:content-none hover:underline">
          {dict.wizard.vin.demoHint}
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_VINS.map((demoVin) => (
            <button
              key={demoVin}
              type="button"
              onClick={() => {
                setVin(demoVin)
                setResult(null)
              }}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground transition duration-200 hover:border-accent hover:text-accent"
            >
              {demoVin}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}

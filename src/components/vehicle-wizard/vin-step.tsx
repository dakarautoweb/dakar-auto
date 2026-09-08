'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { identifyVinAction } from '@/src/services/vin/actions'
import { normalizeVin, validateVin } from '@/src/lib/vin'
import { DEMO_VINS } from '@/src/services/vin/demo-vins'
import type { VinLookupResult } from '@/src/services/vin/types'
import { vehicleResultToConfirmed, type ConfirmedVehicle } from './types'
import { VehicleResultCard } from './vehicle-result-card'

export function VinStep({
  dict,
  initialVin,
  onVehicleConfirmed,
  onManual,
  onScan,
}: {
  dict: Dictionary
  initialVin?: string
  onVehicleConfirmed: (vehicle: ConfirmedVehicle) => void
  onManual: () => void
  onScan: () => void
}) {
  const [vin, setVin] = useState(initialVin ? normalizeVin(initialVin) : '')
  const [result, setResult] = useState<VinLookupResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const autoSubmitted = useRef(false)

  function runLookup(value: string) {
    startTransition(async () => {
      const lookup = await identifyVinAction(value)
      setResult(lookup)
    })
  }

  useEffect(() => {
    if (!initialVin || autoSubmitted.current) return
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
    return (
      <VehicleResultCard
        vehicle={confirmed}
        dict={dict}
        onConfirm={() => onVehicleConfirmed(confirmed)}
        onEditVin={() => setResult(null)}
        onNotMine={onManual}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.vin.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.vin.description}</p>

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
          className="w-full rounded-xl border border-border bg-background px-4 py-4 font-mono text-foreground uppercase tracking-widest shadow-sm placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />

        {validationError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {validationError === 'length' ? dict.wizard.vin.errorLength : dict.wizard.vin.errorCharacters}
          </p>
        )}

        {(result?.status === 'not_found' || result?.status === 'unavailable') && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
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
                className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dict.wizard.vin.retry}
              </button>
              <button
                type="button"
                onClick={onManual}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
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

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? dict.wizard.vin.loading : dict.wizard.vin.submit}
          </button>
          <button
            type="button"
            onClick={onScan}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            {dict.hero.secondaryCta}
          </button>
          <button
            type="button"
            onClick={onManual}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
          >
            {dict.wizard.vin.manualCta}
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
              className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              {demoVin}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}

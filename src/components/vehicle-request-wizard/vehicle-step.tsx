'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VehicleWantedFormState } from './types'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

export function VehicleStep({
  dict,
  initialValue,
  onBack,
  onContinue,
}: {
  dict: Dictionary
  initialValue?: VehicleWantedFormState | null
  onBack?: () => void
  onContinue: (vehicle: VehicleWantedFormState) => void
}) {
  const t = dict.vehicleRequestWizard.vehicleStep
  const [make, setMake] = useState(initialValue?.make ?? '')
  const [model, setModel] = useState(initialValue?.model ?? '')
  const [yearFrom, setYearFrom] = useState(initialValue?.yearFrom ?? '')
  const [yearTo, setYearTo] = useState(initialValue?.yearTo ?? '')
  const [color, setColor] = useState(initialValue?.color ?? '')
  const [engine, setEngine] = useState(initialValue?.engine ?? '')
  const [transmission, setTransmission] = useState(initialValue?.transmission ?? '')
  const [mileageMin, setMileageMin] = useState(initialValue?.mileageMin ?? '')
  const [mileageMax, setMileageMax] = useState(initialValue?.mileageMax ?? '')
  const [trimLevel, setTrimLevel] = useState(initialValue?.trimLevel ?? '')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onContinue({
      make: make.trim(),
      model: model.trim(),
      yearFrom: yearFrom.trim(),
      yearTo: yearTo.trim(),
      color: color.trim(),
      engine: engine.trim(),
      transmission: transmission.trim(),
      mileageMin: mileageMin.trim(),
      mileageMax: mileageMax.trim(),
      trimLevel: trimLevel.trim(),
    })
  }

  const currentYear = new Date().getFullYear()

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.description}</p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vr-make" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.makeLabel}
            </label>
            <input id="vr-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder={t.makePlaceholder} className={inputClass} />
          </div>
          <div>
            <label htmlFor="vr-model" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.modelLabel}
            </label>
            <input
              id="vr-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t.modelPlaceholder}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vr-year-from" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.yearFromLabel}
            </label>
            <input
              id="vr-year-from"
              type="number"
              inputMode="numeric"
              min={1950}
              max={currentYear + 1}
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="vr-year-to" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.yearToLabel}
            </label>
            <input
              id="vr-year-to"
              type="number"
              inputMode="numeric"
              min={1950}
              max={currentYear + 1}
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vr-color" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.colorLabel}
            </label>
            <input
              id="vr-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={t.colorPlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="vr-trim" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.trimLevelLabel}
            </label>
            <input
              id="vr-trim"
              value={trimLevel}
              onChange={(e) => setTrimLevel(e.target.value)}
              placeholder={t.trimLevelPlaceholder}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vr-engine" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.engineLabel}
            </label>
            <input
              id="vr-engine"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              placeholder={t.enginePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="vr-transmission" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.transmissionLabel}
            </label>
            <input
              id="vr-transmission"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              placeholder={t.transmissionPlaceholder}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vr-mileage-min" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.mileageMinLabel}
            </label>
            <input
              id="vr-mileage-min"
              type="number"
              inputMode="numeric"
              min={0}
              value={mileageMin}
              onChange={(e) => setMileageMin(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="vr-mileage-max" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.mileageMaxLabel}
            </label>
            <input
              id="vr-mileage-max"
              type="number"
              inputMode="numeric"
              min={0}
              value={mileageMax}
              onChange={(e) => setMileageMax(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
        >
          {t.continue}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
          >
            {dict.wizard.common.back}
          </button>
        )}
      </div>
    </form>
  )
}

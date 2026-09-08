'use client'

import { useMemo, useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import {
  VEHICLE_MAKES,
  VEHICLE_ENGINES,
  getModelsForMake,
  getVehicleYears,
} from '@/src/services/vehicle-data/demo-data'
import type { ConfirmedVehicle } from './types'

const selectClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50'

export function ManualVehicleForm({
  dict,
  onConfirm,
  onBackToVin,
}: {
  dict: Dictionary
  onConfirm: (vehicle: ConfirmedVehicle) => void
  onBackToVin?: () => void
}) {
  const years = useMemo(() => getVehicleYears(), [])
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [engine, setEngine] = useState('')

  const models = make ? getModelsForMake(make) : []
  const isValid = year !== '' && make !== '' && model !== ''

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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.manual.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.manual.description}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="manual-year" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.manual.yearLabel}
          </label>
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
          <label htmlFor="manual-make" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.manual.makeLabel}
          </label>
          <select
            id="manual-make"
            value={make}
            onChange={(e) => {
              setMake(e.target.value)
              setModel('')
            }}
            className={selectClass}
          >
            <option value="">{dict.wizard.manual.makePlaceholder}</option>
            {VEHICLE_MAKES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="manual-model" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.manual.modelLabel}
          </label>
          <select
            id="manual-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!make}
            className={selectClass}
          >
            <option value="">{dict.wizard.manual.modelPlaceholder}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="manual-engine" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.manual.engineLabel}
          </label>
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
        <button
          type="submit"
          disabled={!isValid}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dict.wizard.manual.confirm}
        </button>
        {onBackToVin && (
          <button
            type="button"
            onClick={onBackToVin}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
          >
            {dict.wizard.manual.backToVin}
          </button>
        )}
      </div>
    </form>
  )
}

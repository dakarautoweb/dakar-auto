'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses, cardClasses, inputClass } from '@/src/components/ui/styles'
import {
  EngineSpecIcon,
  LayersIcon,
  MakeIcon,
  MileageIcon,
  ModelIcon,
  PaletteIcon,
  TransmissionSpecIcon,
  YearIcon,
} from '@/src/components/ui/dakar-icons'
import { FieldLabel } from './field-label'
import type { VehicleWantedFormState } from './types'

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
    <form onSubmit={handleSubmit} className={cardClasses()}>
      <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.description}</p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel icon={MakeIcon} htmlFor="vr-make">
              {t.makeLabel}
            </FieldLabel>
            <input id="vr-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder={t.makePlaceholder} className={inputClass} />
          </div>
          <div>
            <FieldLabel icon={ModelIcon} htmlFor="vr-model">
              {t.modelLabel}
            </FieldLabel>
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
            <FieldLabel icon={YearIcon} htmlFor="vr-year-from">
              {t.yearFromLabel}
            </FieldLabel>
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
            <FieldLabel icon={YearIcon} htmlFor="vr-year-to">
              {t.yearToLabel}
            </FieldLabel>
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
            <FieldLabel icon={PaletteIcon} htmlFor="vr-color">
              {t.colorLabel}
            </FieldLabel>
            <input
              id="vr-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={t.colorPlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel icon={LayersIcon} htmlFor="vr-trim">
              {t.trimLevelLabel}
            </FieldLabel>
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
            <FieldLabel icon={EngineSpecIcon} htmlFor="vr-engine">
              {t.engineLabel}
            </FieldLabel>
            <input
              id="vr-engine"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              placeholder={t.enginePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel icon={TransmissionSpecIcon} htmlFor="vr-transmission">
              {t.transmissionLabel}
            </FieldLabel>
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
            <FieldLabel icon={MileageIcon} htmlFor="vr-mileage-min">
              {t.mileageMinLabel}
            </FieldLabel>
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
            <FieldLabel icon={MileageIcon} htmlFor="vr-mileage-max">
              {t.mileageMaxLabel}
            </FieldLabel>
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
        <button type="submit" className={buttonClasses({ variant: 'primary' })}>
          {t.continue}
        </button>
        {onBack && (
          <button type="button" onClick={onBack} className={buttonClasses({ variant: 'secondary-muted' })}>
            {dict.wizard.common.back}
          </button>
        )}
      </div>
    </form>
  )
}

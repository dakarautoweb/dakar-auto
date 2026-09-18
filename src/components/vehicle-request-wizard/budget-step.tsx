'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buttonClasses, cardClasses, inputClass } from '@/src/components/ui/styles'
import { NotesIcon, PriceTagIcon } from '@/src/components/home/icons'
import { FieldLabel } from './field-label'
import type { BudgetFormState } from './types'

const CURRENCIES = ['XOF', 'EUR', 'USD', 'CAD']

export function BudgetStep({
  dict,
  initialValue,
  onBack,
  onContinue,
}: {
  dict: Dictionary
  initialValue?: BudgetFormState | null
  onBack: () => void
  onContinue: (budget: BudgetFormState) => void
}) {
  const t = dict.vehicleRequestWizard.budgetStep
  const [budgetMin, setBudgetMin] = useState(initialValue?.budgetMin ?? '')
  const [budgetMax, setBudgetMax] = useState(initialValue?.budgetMax ?? '')
  const [currency, setCurrency] = useState(initialValue?.currency ?? CURRENCIES[0])
  const [otherPreferences, setOtherPreferences] = useState(initialValue?.otherPreferences ?? '')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onContinue({
      budgetMin: budgetMin.trim(),
      budgetMax: budgetMax.trim(),
      currency,
      otherPreferences: otherPreferences.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cardClasses()}>
      <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.description}</p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <FieldLabel icon={PriceTagIcon} htmlFor="vr-budget-min">
              {t.budgetMinLabel}
            </FieldLabel>
            <input
              id="vr-budget-min"
              type="number"
              inputMode="decimal"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel icon={PriceTagIcon} htmlFor="vr-budget-max">
              {t.budgetMaxLabel}
            </FieldLabel>
            <input
              id="vr-budget-max"
              type="number"
              inputMode="decimal"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="vr-currency" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.currencyLabel}
            </label>
            <select id="vr-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel icon={NotesIcon} htmlFor="vr-other-preferences">
            {t.otherPreferencesLabel}
          </FieldLabel>
          <textarea
            id="vr-other-preferences"
            value={otherPreferences}
            onChange={(e) => setOtherPreferences(e.target.value)}
            placeholder={t.otherPreferencesPlaceholder}
            rows={4}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className={buttonClasses({ variant: 'primary' })}>
          {t.continue}
        </button>
        <button type="button" onClick={onBack} className={buttonClasses({ variant: 'secondary-muted' })}>
          {dict.wizard.common.back}
        </button>
      </div>
    </form>
  )
}

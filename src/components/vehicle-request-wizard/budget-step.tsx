'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { BudgetFormState } from './types'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t.description}</p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="vr-budget-min" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.budgetMinLabel}
            </label>
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
            <label htmlFor="vr-budget-max" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t.budgetMaxLabel}
            </label>
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
          <label htmlFor="vr-other-preferences" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.otherPreferencesLabel}
          </label>
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
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
        >
          {t.continue}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
        >
          {dict.wizard.common.back}
        </button>
      </div>
    </form>
  )
}

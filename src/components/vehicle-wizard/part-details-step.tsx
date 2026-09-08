'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PartCondition, PartSide } from '@/src/services/requests/types'
import { PhotoUpload } from './photo-upload'
import type { PartFormState, SelectedPhoto } from './types'

const SIDE_RELEVANT_CATEGORIES = new Set(['lighting', 'braking', 'body', 'suspension', 'electrical', 'other'])

const inputClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

const pillClass = (active: boolean) =>
  `rounded-lg border px-4 py-2 text-sm font-medium transition ${
    active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
  }`

export function PartDetailsStep({
  dict,
  category,
  initialValue,
  photos,
  onPhotosChange,
  onBack,
  onContinue,
}: {
  dict: Dictionary
  category: string
  initialValue?: PartFormState | null
  photos: SelectedPhoto[]
  onPhotosChange: (photos: SelectedPhoto[]) => void
  onBack: () => void
  onContinue: (part: PartFormState) => void
}) {
  const [partName, setPartName] = useState(initialValue?.partName ?? '')
  const [side, setSide] = useState<PartSide | null>(initialValue?.side ?? null)
  const [condition, setCondition] = useState<PartCondition>(initialValue?.condition ?? 'no_preference')
  const [quantity, setQuantity] = useState(initialValue?.quantity ?? 1)
  const [description, setDescription] = useState(initialValue?.description ?? '')

  const showSide = SIDE_RELEVANT_CATEGORIES.has(category)
  const isValid = partName.trim().length > 0 && quantity >= 1

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isValid) return
    onContinue({ category, partName: partName.trim(), side, condition, quantity, description: description.trim() })
  }

  const conditionOptions: { value: PartCondition; label: string }[] = [
    { value: 'oem', label: dict.wizard.partDetails.conditionOem },
    { value: 'aftermarket', label: dict.wizard.partDetails.conditionAftermarket },
    { value: 'used', label: dict.wizard.partDetails.conditionUsed },
    { value: 'no_preference', label: dict.wizard.partDetails.conditionNoPreference },
  ]

  const sideOptions: { value: PartSide; label: string }[] = [
    { value: 'left', label: dict.wizard.partDetails.sideLeft },
    { value: 'right', label: dict.wizard.partDetails.sideRight },
    { value: 'both', label: dict.wizard.partDetails.sideBoth },
  ]

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.partDetails.title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{dict.wizard.partDetails.description}</p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="part-name" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.partDetails.partNameLabel}
          </label>
          <input
            id="part-name"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder={dict.wizard.partDetails.partNamePlaceholder}
            className={inputClass}
          />
        </div>

        {showSide && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{dict.wizard.partDetails.sideLabel}</span>
            <div className="flex flex-wrap gap-2">
              {sideOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSide(side === opt.value ? null : opt.value)}
                  aria-pressed={side === opt.value}
                  className={pillClass(side === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{dict.wizard.partDetails.conditionLabel}</span>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCondition(opt.value)}
                aria-pressed={condition === opt.value}
                className={pillClass(condition === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-32">
          <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.partDetails.quantityLabel}
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="part-description" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.wizard.partDetails.descriptionLabel}
          </label>
          <textarea
            id="part-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={dict.wizard.partDetails.descriptionPlaceholder}
            rows={4}
            className={inputClass}
          />
        </div>

        <PhotoUpload dict={dict} photos={photos} onChange={onPhotosChange} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!isValid}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dict.wizard.partDetails.continue}
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

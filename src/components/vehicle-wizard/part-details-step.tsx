'use client'

import { useState, type ReactNode } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PartCondition, PartSide } from '@/src/services/requests/types'
import { buttonClasses, cardClasses, inputClass, pillClasses } from '@/src/components/ui/styles'
import {
  ArrowRightIcon,
  CheckIcon,
  CubeIcon,
  HashIcon,
  ImageIcon,
  NotesIcon,
  PriceTagIcon,
  SettingsGearIcon,
  SideArrowsIcon,
} from '@/src/components/home/icons'
import { PhotoUpload } from './photo-upload'
import type { PartFormState, SelectedPhoto } from './types'

const SIDE_RELEVANT_CATEGORIES = new Set(['lighting', 'braking', 'body', 'suspension', 'electrical', 'other'])

// Small subtle icon container placed to the left of each field — one
// consistent visual family/size across the whole form.
function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
      {children}
    </span>
  )
}

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
  onPhotosChange: (update: SelectedPhoto[] | ((prev: SelectedPhoto[]) => SelectedPhoto[])) => void
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
    <form onSubmit={handleSubmit} className={cardClasses()}>
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-accent/40 bg-accent-soft text-accent">
          <CubeIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{dict.wizard.partDetails.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{dict.wizard.partDetails.description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="flex items-start gap-3">
          <FieldIcon>
            <PriceTagIcon className="h-[18px] w-[18px]" />
          </FieldIcon>
          <div className="flex-1">
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
        </div>

        {showSide && (
          <div className="flex items-start gap-3">
            <FieldIcon>
              <SideArrowsIcon className="h-[18px] w-[18px]" />
            </FieldIcon>
            <div className="flex-1">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{dict.wizard.partDetails.sideLabel}</span>
              <div className="flex flex-wrap gap-2">
                {sideOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSide(side === opt.value ? null : opt.value)}
                    aria-pressed={side === opt.value}
                    className={pillClasses(side === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <FieldIcon>
            <SettingsGearIcon className="h-[18px] w-[18px]" />
          </FieldIcon>
          <div className="flex-1">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{dict.wizard.partDetails.conditionLabel}</span>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map((opt) => {
                const active = condition === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCondition(opt.value)}
                    aria-pressed={active}
                    className={pillClasses(active, active ? 'gap-1.5 pl-3' : '')}
                  >
                    {active && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FieldIcon>
            <HashIcon className="h-[18px] w-[18px]" />
          </FieldIcon>
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
        </div>

        <div className="flex items-start gap-3">
          <FieldIcon>
            <NotesIcon className="h-[18px] w-[18px]" />
          </FieldIcon>
          <div className="flex-1">
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
        </div>

        <div className="flex items-start gap-3">
          <FieldIcon>
            <ImageIcon className="h-[18px] w-[18px]" />
          </FieldIcon>
          <div className="flex-1">
            <PhotoUpload dict={dict} photos={photos} onChange={onPhotosChange} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <button type="submit" disabled={!isValid} className={buttonClasses({ variant: 'primary' })}>
          {dict.wizard.partDetails.continue}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={onBack} className={buttonClasses({ variant: 'secondary-muted' })}>
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
          {dict.wizard.common.back}
        </button>
      </div>
    </form>
  )
}

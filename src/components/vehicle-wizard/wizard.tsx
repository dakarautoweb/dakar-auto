'use client'

import { useState, useTransition } from 'react'
import type { Locale } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { submitPartsRequestAction } from '@/src/services/requests/actions'
import { submitPartsRequestWithPhotos } from '@/src/services/requests/submit-with-photos'
import type { AttachmentSummary, ConfirmedVehicle, ContactFormState, PartFormState, SelectedPhoto, WizardStep } from './types'
import { ProgressSteps } from './progress-steps'
import { VinStep } from './vin-step'
import { ManualVehicleForm } from './manual-vehicle-form'
import { ScanVinModal } from './scan-vin-modal'
import { CategoryStep } from './category-step'
import { PartDetailsStep } from './part-details-step'
import { ContactStep } from './contact-step'
import { ReviewStep } from './review-step'
import { SuccessStep } from './success-step'

export function VehicleWizard({
  dict,
  locale,
  initialVin,
  initialScanOpen,
}: {
  dict: Dictionary
  locale: Locale
  initialVin?: string
  initialScanOpen?: boolean
}) {
  const [step, setStep] = useState<WizardStep>('vehicle')
  const [vehicleMode, setVehicleMode] = useState<'vin' | 'manual'>('vin')
  const [scanOpen, setScanOpen] = useState(Boolean(initialScanOpen))
  const [vehicle, setVehicle] = useState<ConfirmedVehicle | null>(null)

  const [categoryChoice, setCategoryChoice] = useState<string | null>(null)
  const [partPhase, setPartPhase] = useState<'category' | 'details'>('category')
  const [part, setPart] = useState<PartFormState | null>(null)
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])

  const [contact, setContact] = useState<ContactFormState | null>(null)

  const [submitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [attachmentSummary, setAttachmentSummary] = useState<AttachmentSummary | null>(null)

  function handleVehicleConfirmed(confirmed: ConfirmedVehicle) {
    setVehicle(confirmed)
    setStep('parts')
  }

  function handleCategorySelected(category: string) {
    setCategoryChoice(category)
    setPartPhase('details')
  }

  function handlePartContinue(newPart: PartFormState) {
    setPart(newPart)
    setStep('contact')
  }

  function handleContactContinue(newContact: ContactFormState) {
    setContact(newContact)
    setStep('review')
  }

  function handleEdit(target: WizardStep) {
    if (target === 'vehicle' && vehicle) setVehicleMode(vehicle.source)
    if (target === 'parts') setPartPhase('details')
    setStep(target)
  }

  function handleSubmit() {
    if (!vehicle || !part || !contact) return
    setSubmitError(null)
    startSubmit(async () => {
      if (photos.length === 0) {
        const result = await submitPartsRequestAction({ vehicle, part, contact, locale })
        if (result.ok) {
          setRequestNumber(result.requestNumber)
        } else {
          setSubmitError(dict.wizard.review.errorGeneric)
        }
        return
      }

      const result = await submitPartsRequestWithPhotos(
        { vehicle, part, contact, locale },
        photos.map((p) => ({ file: p.file, attachmentType: p.attachmentType }))
      )
      if (result.ok) {
        setRequestNumber(result.requestNumber)
        setAttachmentSummary(result.attachments)
      } else {
        setSubmitError(dict.wizard.review.errorGeneric)
      }
    })
  }

  if (requestNumber) {
    return <SuccessStep dict={dict} requestNumber={requestNumber} attachmentSummary={attachmentSummary} />
  }

  return (
    <div>
      <ProgressSteps current={step} dict={dict} />

      <div className="mt-8">
        {step === 'vehicle' && vehicleMode === 'vin' && (
          <VinStep
            dict={dict}
            initialVin={initialVin}
            onVehicleConfirmed={handleVehicleConfirmed}
            onManual={() => setVehicleMode('manual')}
            onScan={() => setScanOpen(true)}
          />
        )}
        {step === 'vehicle' && vehicleMode === 'manual' && (
          <ManualVehicleForm dict={dict} onConfirm={handleVehicleConfirmed} onBackToVin={() => setVehicleMode('vin')} />
        )}

        {step === 'parts' && partPhase === 'category' && (
          <CategoryStep dict={dict} selectedCategory={categoryChoice} onSelect={handleCategorySelected} />
        )}
        {step === 'parts' && partPhase === 'details' && categoryChoice && (
          <PartDetailsStep
            dict={dict}
            category={categoryChoice}
            initialValue={part}
            photos={photos}
            onPhotosChange={setPhotos}
            onBack={() => setPartPhase('category')}
            onContinue={handlePartContinue}
          />
        )}

        {step === 'contact' && (
          <ContactStep
            dict={dict}
            initialValue={contact}
            onBack={() => {
              setPartPhase('details')
              setStep('parts')
            }}
            onContinue={handleContactContinue}
          />
        )}

        {step === 'review' && vehicle && part && contact && (
          <ReviewStep
            dict={dict}
            vehicle={vehicle}
            part={part}
            photos={photos}
            contact={contact}
            submitting={submitting}
            submitError={submitError}
            onEdit={handleEdit}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {scanOpen && (
        <ScanVinModal
          dict={dict}
          onClose={() => setScanOpen(false)}
          onManual={() => {
            setScanOpen(false)
            setVehicleMode('manual')
          }}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { Locale } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { submitPartsRequestAction } from '@/src/services/requests/actions'
import { TurnstileWidget, type TurnstileWidgetHandle } from '@/src/components/turnstile-widget'
import type { AttachmentSummary, ConfirmedVehicle, ContactFormState, PartFormState, PartialVinMatch, SelectedPhoto, WizardStep } from './types'
import { usePartRequestWizard } from './wizard-context'
import { ProgressSteps } from './progress-steps'
import { VinStep } from './vin-step'
import { ManualVehicleForm } from './manual-vehicle-form'
import { ScanVinModal } from './scan-vin-modal'
import { CategoryStep } from './category-step'
import { SubcategoryStep } from './subcategory-step'
import { PartDetailsStep } from './part-details-step'
import { OTHER_KEY } from '@/src/lib/parts-catalog'
import type { PartRecognitionResult } from '@/src/lib/part-recognition/types'
import { planRecognitionApplication, toRecognitionVehicleContext } from '@/src/lib/part-recognition/wizard-mapping'
import { ContactStep } from './contact-step'
import { ReviewStep } from './review-step'
import { SuccessStep } from './success-step'

export function VehicleWizard({
  dict,
  locale,
  initialVin,
  initialScanOpen,
  initialManual,
}: {
  dict: Dictionary
  locale: Locale
  initialVin?: string
  initialScanOpen?: boolean
  // Set when the homepage's own VIN box already failed (not_found/
  // unavailable) and the user picked "Select Manually" there — its CTA
  // navigates here with ?manual=1 instead of dropping the user back on a
  // fresh VIN screen that would require picking "manual" a second time.
  initialManual?: boolean
}) {
  // vehicle / category / selectedPart live in the shared cross-route
  // context (see wizard-context.tsx) — they may already be seeded here by
  // the time this component mounts, either by the homepage hero (vehicle
  // confirmed before navigating in) or by the Pièces page (category +
  // part picked before navigating in). Everything else below this point
  // (current screen, in-progress part-details form, contact, photos,
  // submission state) is only ever touched from inside this one mounted
  // wizard, so it stays local state as before.
  const wizard = usePartRequestWizard()

  // Navigation rule: after a vehicle is confirmed, skip straight to Part
  // Details if a part was already picked (Pièces entry); otherwise go to
  // category selection (homepage entry, or a direct/fresh visit). This
  // same rule is re-applied in handleVehicleConfirmed below every time a
  // vehicle is (re)confirmed later, not just on first mount.
  const [step, setStep] = useState<WizardStep>(() => (wizard.vehicle ? 'parts' : 'vehicle'))
  const [vehicleMode, setVehicleMode] = useState<'vin' | 'manual'>(() => (initialManual ? 'manual' : 'vin'))
  const [scanOpen, setScanOpen] = useState(Boolean(initialScanOpen))
  const [scannedVin, setScannedVin] = useState<string | null>(null)
  // A VIN decode that only identified the make — kept for as long as the
  // customer stays on the manual form it opened (including coming back to
  // it from Review's "Edit"), so the make stays pre-filled and locked.
  const [partialMatch, setPartialMatch] = useState<PartialVinMatch | null>(null)
  // The partial match's VIN, once the customer leaves its manual form for
  // the VIN screen again — re-shown in the field, but not auto-looked-up.
  const [vinAfterPartial, setVinAfterPartial] = useState<string | null>(null)

  const [partPhase, setPartPhase] = useState<'category' | 'subcategory' | 'details'>(() =>
    wizard.vehicle && wizard.selectedPart ? 'details' : 'category',
  )
  // Prefilled from the shared wizard state when a part was already chosen
  // on the Pièces page (category + partName), so Part Details opens with
  // "Nom de la pièce" already filled in instead of asking again.
  const [part, setPart] = useState<PartFormState | null>(() =>
    wizard.selectedPart
      ? {
          category: wizard.category ?? '',
          partName: wizard.selectedPart.key === OTHER_KEY ? '' : wizard.selectedPart.label,
          side: null,
          condition: 'no_preference',
          quantity: 1,
          description: '',
        }
      : null,
  )
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  // VehicleWizard (not PhotoUpload) owns `photos` for the whole flow — its
  // object URLs need to stay valid from Part Details all the way through
  // Review, across Part Details mounting/unmounting as the user moves
  // between steps. So the revoke-on-unmount that used to live in
  // PhotoUpload (and fired every time that step unmounted, breaking Review's
  // thumbnails) belongs here instead, tied to this component's own
  // lifetime. `photosRef` mirrors `photos` so the cleanup below always sees
  // the latest list without re-running on every photo change.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    }
  }, [])

  const [contact, setContact] = useState<ContactFormState | null>(null)

  const [submitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [trackingToken, setTrackingToken] = useState<string | null>(null)
  const [attachmentSummary, setAttachmentSummary] = useState<AttachmentSummary | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)

  function handleVehicleConfirmed(confirmed: ConfirmedVehicle) {
    wizard.setVehicle(confirmed)
    setStep('parts')
    // Key navigation rule: a part picked before identification (Pièces
    // entry) goes straight to its details form; otherwise category
    // selection comes next (homepage entry / a fresh, direct visit).
    setPartPhase(wizard.selectedPart ? 'details' : 'category')
  }

  function handlePartialMatch(match: PartialVinMatch) {
    setPartialMatch(match)
    setVehicleMode('manual')
  }

  function handleBackToVin() {
    if (partialMatch) {
      setVinAfterPartial(partialMatch.vin)
      setPartialMatch(null)
    }
    setVehicleMode('vin')
  }

  function handleCategorySelected(category: string) {
    // An intentional category change clears only the selected part (and,
    // here, its dependent part-details draft) — the vehicle is untouched.
    wizard.changeCategory(category)
    setPart(null)
    // The top-level "Other" tile has no subcategories of its own — it goes
    // straight to the free-text part details, same as before.
    setPartPhase(category === OTHER_KEY ? 'details' : 'subcategory')
  }

  function handleSubcategorySelected(subcategory: { key: string; label: string }) {
    wizard.selectSubcategory(subcategory)
    // Map the chosen subcategory into the existing free-text partName field
    // — no new request field needed. "Other" leaves it blank so the
    // already-required partName input doubles as the custom description;
    // picking a real subcategory pre-fills it but leaves it fully editable.
    setPart((prev) => ({
      category: wizard.category ?? '',
      partName: subcategory.key === OTHER_KEY ? '' : subcategory.label,
      side: prev?.side ?? null,
      condition: prev?.condition ?? 'no_preference',
      quantity: prev?.quantity ?? 1,
      description: prev?.description ?? '',
    }))
    setPartPhase('details')
  }

  // "Use this part/category" from photo recognition. A full match fills in
  // category + subcategory + part name and skips straight to Part Details;
  // a category-only match lands on the normal subcategory grid so the
  // customer confirms it; anything else leaves the manual flow untouched.
  function handleRecognitionUsed(result: PartRecognitionResult) {
    const plan = planRecognitionApplication(result, dict.categories.items)
    if (plan.kind === 'manual') return
    if (plan.kind === 'subcategory') {
      handleCategorySelected(plan.category)
      return
    }
    wizard.changeCategory(plan.category)
    wizard.selectSubcategory(plan.subcategory)
    setPart({ category: plan.category, partName: plan.partName, side: null, condition: 'no_preference', quantity: 1, description: '' })
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
    if (target === 'vehicle' && wizard.vehicle) setVehicleMode(wizard.vehicle.source)
    if (target === 'parts') setPartPhase('details')
    setStep(target)
  }

  const uploadsInProgress = photos.some((p) => p.status === 'uploading')

  function handleSubmit() {
    const vehicle = wizard.vehicle
    if (!vehicle || !part || !contact || uploadsInProgress || !turnstileToken) return
    setSubmitError(null)
    startSubmit(async () => {
      // Photos that failed to upload are simply dropped from the request —
      // the customer already saw a per-thumbnail failed/retry state in
      // PhotoUpload before reaching this step, so this never silently loses
      // a photo they thought succeeded.
      const attachments = photos
        .filter((p) => p.status === 'uploaded' && p.fileToken)
        .map((p) => ({ clientId: p.id, fileToken: p.fileToken!, originalFileName: p.file.name, attachmentType: p.attachmentType }))

      const result = await submitPartsRequestAction({ vehicle, part, contact, locale }, attachments, turnstileToken)
      if (result.ok) {
        setRequestNumber(result.requestNumber)
        setTrackingToken(result.trackingToken)
        if (result.attachments) {
          setAttachmentSummary({
            uploaded: result.attachments.filter((a) => a.ok).length,
            failed: result.attachments.filter((a) => !a.ok).length,
          })
        }
        return
      }

      if (result.error === 'turnstile') {
        setSubmitError(result.message === 'missing_token' ? dict.turnstile.required : dict.turnstile.failed)
      } else {
        setSubmitError(dict.wizard.review.errorGeneric)
      }
      // Any failure — including a failed Turnstile check itself — must
      // never let a retry reuse the same token (item 8).
      setTurnstileToken('')
      turnstileRef.current?.reset()
    })
  }

  if (requestNumber && trackingToken) {
    return <SuccessStep dict={dict} requestNumber={requestNumber} trackingToken={trackingToken} attachmentSummary={attachmentSummary} />
  }

  return (
    <div>
      <ProgressSteps current={step} dict={dict} />

      <div className="mt-8">
        {step === 'vehicle' && vehicleMode === 'vin' && (
          <VinStep
            dict={dict}
            initialVin={vinAfterPartial ?? initialVin}
            autoLookup={vinAfterPartial === null}
            scannedVin={scannedVin}
            entrySource={wizard.entrySource}
            onVehicleConfirmed={handleVehicleConfirmed}
            onPartialMatch={handlePartialMatch}
            onManual={() => setVehicleMode('manual')}
            onScan={() => setScanOpen(true)}
          />
        )}
        {step === 'vehicle' && vehicleMode === 'manual' && (
          <ManualVehicleForm
            dict={dict}
            initialValue={wizard.vehicle?.source === 'manual' ? wizard.vehicle : null}
            partialMatch={partialMatch}
            onConfirm={handleVehicleConfirmed}
            onBackToVin={handleBackToVin}
          />
        )}

        {step === 'parts' && partPhase === 'category' && (
          <CategoryStep
            dict={dict}
            locale={locale}
            vehicle={toRecognitionVehicleContext(wizard.vehicle)}
            selectedCategory={wizard.category}
            onSelect={handleCategorySelected}
            onUseRecognition={handleRecognitionUsed}
            onBack={() => setStep('vehicle')}
          />
        )}
        {step === 'parts' && partPhase === 'subcategory' && wizard.category && (
          <SubcategoryStep
            dict={dict}
            category={wizard.category}
            selectedSubcategory={wizard.selectedPart?.key ?? null}
            onSelect={handleSubcategorySelected}
            onBack={() => setPartPhase('category')}
          />
        )}
        {step === 'parts' && partPhase === 'details' && wizard.category && (
          <PartDetailsStep
            dict={dict}
            category={wizard.category}
            initialValue={part}
            photos={photos}
            onPhotosChange={setPhotos}
            onBack={() => setPartPhase(wizard.category === OTHER_KEY ? 'category' : 'subcategory')}
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

        {step === 'review' && wizard.vehicle && part && contact && (
          <ReviewStep
            dict={dict}
            vehicle={wizard.vehicle}
            part={part}
            photos={photos}
            contact={contact}
            submitting={submitting}
            uploadsInProgress={uploadsInProgress}
            submitError={submitError}
            turnstileToken={turnstileToken}
            turnstileWidget={<TurnstileWidget dict={dict} ref={turnstileRef} onToken={setTurnstileToken} />}
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
          onVinDetected={setScannedVin}
        />
      )}
    </div>
  )
}

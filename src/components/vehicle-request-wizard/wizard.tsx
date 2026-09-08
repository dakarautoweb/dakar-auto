'use client'

import { useState, useTransition } from 'react'
import type { Locale } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { submitVehicleRequestAction } from '@/src/services/vehicle-requests/actions'
import { ContactStep } from '@/src/components/vehicle-wizard/contact-step'
import type { ContactFormState } from '@/src/components/vehicle-wizard/types'
import { ProgressSteps } from './progress-steps'
import { VehicleStep } from './vehicle-step'
import { BudgetStep } from './budget-step'
import { ReviewStep } from './review-step'
import { SuccessStep } from './success-step'
import { parseOptionalFloat, parseOptionalInt, type BudgetFormState, type VehicleWantedFormState, type WizardStep } from './types'

const EMPTY_VEHICLE: VehicleWantedFormState = {
  make: '',
  model: '',
  yearFrom: '',
  yearTo: '',
  color: '',
  engine: '',
  transmission: '',
  mileageMin: '',
  mileageMax: '',
  trimLevel: '',
}

const EMPTY_BUDGET: BudgetFormState = {
  budgetMin: '',
  budgetMax: '',
  currency: 'XOF',
  otherPreferences: '',
}

export function VehicleRequestWizard({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [step, setStep] = useState<WizardStep>('vehicle')
  const [vehicle, setVehicle] = useState<VehicleWantedFormState>(EMPTY_VEHICLE)
  const [budget, setBudget] = useState<BudgetFormState>(EMPTY_BUDGET)
  const [contact, setContact] = useState<ContactFormState | null>(null)

  const [submitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)

  function handleVehicleContinue(newVehicle: VehicleWantedFormState) {
    setVehicle(newVehicle)
    setStep('budget')
  }

  function handleBudgetContinue(newBudget: BudgetFormState) {
    setBudget(newBudget)
    setStep('contact')
  }

  function handleContactContinue(newContact: ContactFormState) {
    setContact(newContact)
    setStep('review')
  }

  function handleEdit(target: WizardStep) {
    setStep(target)
  }

  function handleSubmit() {
    if (!contact) return
    setSubmitError(null)
    startSubmit(async () => {
      const result = await submitVehicleRequestAction({
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          yearFrom: parseOptionalInt(vehicle.yearFrom),
          yearTo: parseOptionalInt(vehicle.yearTo),
          color: vehicle.color,
          engine: vehicle.engine,
          transmission: vehicle.transmission,
          mileageMin: parseOptionalInt(vehicle.mileageMin),
          mileageMax: parseOptionalInt(vehicle.mileageMax),
          trimLevel: vehicle.trimLevel,
          budgetMin: parseOptionalFloat(budget.budgetMin),
          budgetMax: parseOptionalFloat(budget.budgetMax),
          currency: budget.currency,
          otherPreferences: budget.otherPreferences,
        },
        contact,
        locale,
      })

      if (result.ok) {
        setRequestNumber(result.requestNumber)
      } else {
        setSubmitError(dict.vehicleRequestWizard.review.errorGeneric)
      }
    })
  }

  if (requestNumber) {
    return <SuccessStep dict={dict} requestNumber={requestNumber} vehicle={vehicle} />
  }

  return (
    <div>
      <ProgressSteps current={step} dict={dict} />

      <div className="mt-8">
        {step === 'vehicle' && <VehicleStep dict={dict} initialValue={vehicle} onContinue={handleVehicleContinue} />}

        {step === 'budget' && (
          <BudgetStep dict={dict} initialValue={budget} onBack={() => setStep('vehicle')} onContinue={handleBudgetContinue} />
        )}

        {step === 'contact' && (
          <ContactStep
            dict={dict}
            initialValue={contact}
            onBack={() => setStep('budget')}
            onContinue={handleContactContinue}
          />
        )}

        {step === 'review' && contact && (
          <ReviewStep
            dict={dict}
            vehicle={vehicle}
            budget={budget}
            contact={contact}
            submitting={submitting}
            submitError={submitError}
            onEdit={handleEdit}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ConfirmedVehicle } from './types'

// Two ways a user can arrive at the part-request wizard — see
// wizard.tsx's routing logic, which branches on this plus the presence of
// `vehicle`/`selectedPart` below to decide the next screen.
export type WizardEntrySource = 'homepage' | 'parts'

// Just enough to resume Part Details with the right field prefilled —
// full request-shape details (side/condition/quantity/description) are
// filled in by PartDetailsStep itself and stay local to VehicleWizard,
// since no other route needs them before that step is reached.
export type SelectedPart = { key: string; label: string }

type PartRequestWizardValue = {
  entrySource: WizardEntrySource | null
  vehicle: ConfirmedVehicle | null
  category: string | null
  selectedPart: SelectedPart | null

  // Pièces entry point (parts-browser.tsx): a subcategory tile was picked
  // before any vehicle is known yet.
  selectPart: (category: string, part: SelectedPart) => void
  // Inside the wizard's own category step: an intentional category change
  // clears only the selected part (and, in the wizard, its dependent
  // part-details form) — the vehicle is never touched by this.
  changeCategory: (category: string) => void
  // Inside the wizard's own subcategory step.
  selectSubcategory: (part: SelectedPart) => void
  // Homepage entry point (hero-vehicle-result.tsx): the hero's VIN card
  // was already confirmed before navigating to the wizard.
  confirmVehicleFromHomepage: (vehicle: ConfirmedVehicle) => void
  // Used by the wizard itself once a vehicle is identified/edited/reset —
  // does not change entrySource, so a vehicle picked mid-wizard doesn't
  // retroactively relabel how the user actually arrived.
  setVehicle: (vehicle: ConfirmedVehicle | null) => void
}

const PartRequestWizardContext = createContext<PartRequestWizardValue | null>(null)

// Mounted once in app/(site)/layout.tsx, above every route — Next.js keeps
// a shared layout (and anything it renders) mounted across client-side
// navigations between sibling routes, so this plain in-memory state
// already survives going from /parts (or the homepage) to
// /vehicle/identify without needing sessionStorage/localStorage or URL
// query strings. It does not survive a hard refresh, same as before this
// refactor — no persistence layer existed previously, and none is added
// here per scope.
export function PartRequestWizardProvider({ children }: { children: ReactNode }) {
  const [entrySource, setEntrySource] = useState<WizardEntrySource | null>(null)
  const [vehicle, setVehicleState] = useState<ConfirmedVehicle | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null)

  const selectPart = useCallback((nextCategory: string, part: SelectedPart) => {
    setEntrySource('parts')
    setCategory(nextCategory)
    setSelectedPart(part)
  }, [])

  const changeCategory = useCallback((nextCategory: string) => {
    setCategory(nextCategory)
    setSelectedPart(null)
  }, [])

  const selectSubcategory = useCallback((part: SelectedPart) => {
    setSelectedPart(part)
  }, [])

  const confirmVehicleFromHomepage = useCallback((confirmed: ConfirmedVehicle) => {
    setEntrySource('homepage')
    setVehicleState(confirmed)
  }, [])

  const setVehicle = useCallback((confirmed: ConfirmedVehicle | null) => {
    setVehicleState(confirmed)
  }, [])

  const value = useMemo<PartRequestWizardValue>(
    () => ({
      entrySource,
      vehicle,
      category,
      selectedPart,
      selectPart,
      changeCategory,
      selectSubcategory,
      confirmVehicleFromHomepage,
      setVehicle,
    }),
    [entrySource, vehicle, category, selectedPart, selectPart, changeCategory, selectSubcategory, confirmVehicleFromHomepage, setVehicle],
  )

  return <PartRequestWizardContext.Provider value={value}>{children}</PartRequestWizardContext.Provider>
}

export function usePartRequestWizard() {
  const ctx = useContext(PartRequestWizardContext)
  if (!ctx) throw new Error('usePartRequestWizard must be used within PartRequestWizardProvider')
  return ctx
}

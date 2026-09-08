import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { generateVehicleRequestNumber } from './request-number'
import type { SubmitVehicleRequestInput } from './types'

export type CreatedVehicleRequest = {
  id: string
  requestNumber: string
  whatsappPhone: string | null
}

// Validation is the caller's responsibility (validateSubmitVehicleRequestInput)
// — this only does the database write and throws on failure.
export async function createVehicleRequestRecord(input: SubmitVehicleRequestInput): Promise<CreatedVehicleRequest> {
  const { vehicle, contact } = input
  const whatsappPhone = contact.whatsappSameAsPhone ? contact.phone : contact.whatsappPhone

  const requestNumber = await generateVehicleRequestNumber()
  const { data: row, error } = await supabaseAdmin
    .from('vehicle_requests')
    .insert({
      request_number: requestNumber,
      customer_name: contact.name.trim(),
      customer_email: contact.email.trim() || null,
      customer_phone: contact.phone.trim(),
      whatsapp_phone: whatsappPhone?.trim() || null,
      make: vehicle.make.trim() || null,
      model: vehicle.model.trim() || null,
      year_from: vehicle.yearFrom,
      year_to: vehicle.yearTo,
      color: vehicle.color.trim() || null,
      engine: vehicle.engine.trim() || null,
      transmission: vehicle.transmission.trim() || null,
      mileage_min: vehicle.mileageMin,
      mileage_max: vehicle.mileageMax,
      trim_level: vehicle.trimLevel.trim() || null,
      budget_min: vehicle.budgetMin,
      budget_max: vehicle.budgetMax,
      currency: vehicle.currency || 'XOF',
      other_preferences: vehicle.otherPreferences.trim() || null,
      preferred_contact_method: contact.preferredContact,
      locale: input.locale,
    })
    .select('id, request_number')
    .single()

  if (error) throw error

  return {
    id: row.id,
    requestNumber: row.request_number,
    whatsappPhone: whatsappPhone?.trim() || null,
  }
}

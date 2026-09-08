'use server'

import { after } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { sendPartsRequestEmails } from '@/src/services/email'
import { generateRequestNumber } from './request-number'
import { validateSubmitPartsRequestInput } from './validate'
import type { SubmitPartsRequestInput, SubmitPartsRequestResult } from './types'

const MAX_REQUEST_NUMBER_ATTEMPTS = 3
const UNIQUE_VIOLATION = '23505'

const SIDE_LABELS: Record<string, string> = {
  left: 'Side: Left',
  right: 'Side: Right',
  both: 'Side: Both',
}

function buildItemDescription(side: string | null, description: string): string | null {
  const parts = [side ? SIDE_LABELS[side] : null, description.trim() || null].filter(Boolean)
  return parts.length > 0 ? parts.join('\n\n') : null
}

async function findOrCreateVehicleId(vehicle: SubmitPartsRequestInput['vehicle']): Promise<string> {
  if (vehicle.vin) {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('vin', vehicle.vin)
      .limit(1)
      .maybeSingle()

    if (findError) throw findError
    if (existing) return existing.id as string
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('vehicles')
    .insert({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      engine: vehicle.engine,
      transmission: vehicle.transmission,
      body_style: vehicle.bodyStyle,
      fuel_type: vehicle.fuelType,
      drivetrain: vehicle.drivetrain,
      image_url: vehicle.imageUrl,
      identification_method: vehicle.source,
      vin_api_data: vehicle.source === 'vin' ? { provider: 'mock', ...vehicle } : null,
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return created.id as string
}

export async function submitPartsRequestAction(
  input: SubmitPartsRequestInput
): Promise<SubmitPartsRequestResult> {
  const validationError = validateSubmitPartsRequestInput(input)
  if (validationError) {
    return { ok: false, error: 'validation', message: validationError }
  }

  try {
    const vehicleId = await findOrCreateVehicleId(input.vehicle)

    const whatsappPhone = input.contact.whatsappSameAsPhone
      ? input.contact.phone
      : input.contact.whatsappPhone

    let requestRow: { id: string; request_number: string } | null = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < MAX_REQUEST_NUMBER_ATTEMPTS; attempt++) {
      const requestNumber = await generateRequestNumber()
      const { data, error } = await supabaseAdmin
        .from('parts_requests')
        .insert({
          request_number: requestNumber,
          vehicle_id: vehicleId,
          customer_name: input.contact.name.trim(),
          customer_email: input.contact.email.trim() || null,
          customer_phone: input.contact.phone.trim(),
          whatsapp_phone: whatsappPhone?.trim() || null,
          whatsapp_same_as_phone: input.contact.whatsappSameAsPhone,
          preferred_contact_method: input.contact.preferredContact,
          locale: input.locale,
        })
        .select('id, request_number')
        .single()

      if (!error) {
        requestRow = data
        break
      }

      if (error.code === UNIQUE_VIOLATION) {
        lastError = error
        continue
      }

      throw error
    }

    if (!requestRow) {
      throw lastError ?? new Error('Failed to allocate a request number')
    }

    const { error: itemError } = await supabaseAdmin.from('parts_request_items').insert({
      request_id: requestRow.id,
      category: input.part.category,
      part_name: input.part.partName.trim(),
      description: buildItemDescription(input.part.side, input.part.description),
      quantity: input.part.quantity,
      condition_preference: input.part.condition,
    })

    if (itemError) throw itemError

    // Fire the confirmation/notification emails after the response is sent —
    // the request is already durably saved, so a slow or failed email must
    // never affect what the user sees. sendPartsRequestEmails is best-effort
    // internally and never throws, but it's wrapped here too as a last line
    // of defense against unexpected errors leaking into the response.
    const requestNumber = requestRow.request_number
    after(async () => {
      try {
        await sendPartsRequestEmails({
          requestNumber,
          locale: input.locale,
          submittedAt: new Date(),
          vehicle: {
            vin: input.vehicle.vin,
            year: input.vehicle.year,
            make: input.vehicle.make,
            model: input.vehicle.model,
          },
          part: {
            categoryKey: input.part.category,
            partName: input.part.partName.trim(),
            side: input.part.side,
            condition: input.part.condition,
            quantity: input.part.quantity,
            description: input.part.description.trim(),
          },
          contact: {
            name: input.contact.name.trim(),
            email: input.contact.email.trim() || null,
            phone: input.contact.phone.trim(),
            whatsappPhone: whatsappPhone?.trim() || null,
            preferredContact: input.contact.preferredContact,
          },
        })
      } catch (err) {
        console.error('[email] Unexpected error sending parts request emails:', err instanceof Error ? err.message : 'Unknown error')
      }
    })

    return { ok: true, requestNumber }
  } catch {
    return { ok: false, error: 'server_error' }
  }
}

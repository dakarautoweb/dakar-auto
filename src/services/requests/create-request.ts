import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { isExpiringImageUrl } from '@/src/services/car-image/image-url-expiry'
import { generateRequestNumber } from './request-number'
import type { SubmitPartsRequestInput } from './types'

const SIDE_LABELS: Record<string, string> = {
  left: 'Side: Left',
  right: 'Side: Right',
  both: 'Side: Both',
}

function buildItemDescription(side: string | null, description: string): string | null {
  const parts = [side ? SIDE_LABELS[side] : null, description.trim() || null].filter(Boolean)
  return parts.length > 0 ? parts.join('\n\n') : null
}

// Reusing an existing vehicles row by VIN is safe for the immutable build
// data a VIN encodes (make/model/year/trim/engine/...) — a VIN identifies
// one specific physical vehicle, so that data doesn't change over time.
// The one accepted gap: a handful of rows created before this task used
// the old mock provider, so a real Auto.dev decode of the same VIN today
// would resolve to a fresher record than what's stored. Not worth an
// active migration for a handful of test-era rows; a future improvement
// could re-decode and refresh vehicles.vin_api_data on reuse if that ever
// matters in practice.
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
      // CarImages API's signed `/image` URLs expire (carry an `expires=`
      // timestamp) — this row is only ever created once per VIN and never
      // revisited, so persisting an expiring URL here would leave it
      // pointing at a broken image forever once the signature lapses.
      // Only a durable URL (e.g. Auto.dev's VIN-specific photo, which
      // isn't signed/time-limited) gets written; an expiring one is
      // dropped here and re-derived live on demand instead (see the admin
      // detail page, which calls lookupCarImage again when this is null).
      image_url: vehicle.imageUrl && !isExpiringImageUrl(vehicle.imageUrl) ? vehicle.imageUrl : null,
      identification_method: vehicle.source,
      // Normalized fields only — never API keys/headers/raw HTTP debug info.
      vin_api_data:
        vehicle.source === 'vin'
          ? {
              provider: vehicle.identificationSource ?? 'unknown',
              vin: vehicle.vin,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              trim: vehicle.trim,
              engine: vehicle.engine,
              transmission: vehicle.transmission,
              bodyStyle: vehicle.bodyStyle,
              fuelType: vehicle.fuelType,
              drivetrain: vehicle.drivetrain,
            }
          : null,
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return created.id as string
}

export type CreatedPartsRequest = {
  id: string
  itemId: string
  requestNumber: string
  // Random, unguessable UUID the DB generates by default on insert (see
  // parts_requests.tracking_token) — the sole key the public /track/[token]
  // page accepts. Never derived from request_number, which is sequential
  // and guessable.
  trackingToken: string
  whatsappPhone: string | null
}

// Validation is the caller's responsibility (validateSubmitPartsRequestInput)
// — this only does the database writes and throws on failure, so callers
// can decide how to surface that (a Server Action result, an HTTP response).
export async function createPartsRequestRecord(input: SubmitPartsRequestInput): Promise<CreatedPartsRequest> {
  const vehicleId = await findOrCreateVehicleId(input.vehicle)

  const whatsappPhone = input.contact.whatsappSameAsPhone ? input.contact.phone : input.contact.whatsappPhone

  const requestNumber = await generateRequestNumber()
  const { data: requestRow, error: requestError } = await supabaseAdmin
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
    .select('id, request_number, tracking_token')
    .single()

  if (requestError) throw requestError

  const { data: itemRow, error: itemError } = await supabaseAdmin
    .from('parts_request_items')
    .insert({
      request_id: requestRow.id,
      category: input.part.category,
      part_name: input.part.partName.trim(),
      description: buildItemDescription(input.part.side, input.part.description),
      quantity: input.part.quantity,
      condition_preference: input.part.condition,
    })
    .select('id')
    .single()

  if (itemError) throw itemError

  return {
    id: requestRow.id,
    itemId: itemRow.id as string,
    requestNumber: requestRow.request_number,
    trackingToken: requestRow.tracking_token as string,
    whatsappPhone: whatsappPhone?.trim() || null,
  }
}

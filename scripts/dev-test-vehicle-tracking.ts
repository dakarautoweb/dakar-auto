// One-off manual verification script for VR- tracking (item 15 of the task)
// — NOT part of `npm run test`. Hits the real Supabase project configured
// in .env.local via supabaseAdmin, so it only works once the required
// migration has been applied:
//
//   ALTER TABLE vehicle_requests
//     ADD COLUMN tracking_token uuid NOT NULL DEFAULT gen_random_uuid();
//   CREATE UNIQUE INDEX vehicle_requests_tracking_token_key
//     ON vehicle_requests (tracking_token);
//
// Run with:
//   npx tsx --tsconfig tsconfig.scripts.json --env-file=.env.local scripts/dev-test-vehicle-tracking.ts
// (tsconfig.scripts.json aliases the bare `server-only` import — see
// src/test/server-only-stub.ts — to a no-op stub; the real `server-only`
// npm package always throws outside a bundler, by design, so it can't be
// used here even if installed.)
//
// Creates exactly one temporary vehicle_requests row, exercises the public
// lookup + sanitized-info functions against it, and deletes it afterward
// regardless of pass/fail.

import { supabaseAdmin } from '../src/lib/supabase/server'
import { generateVehicleRequestNumber } from '../src/services/vehicle-requests/request-number'
import { lookupVehicleTrackingToken } from '../src/services/tracking/lookup-vehicle-tracking-token'
import { getVehicleTrackingInfo } from '../src/services/tracking/get-vehicle-tracking-info'

const TEST_EMAIL = 'dev-test-vr@example.com'
const TEST_PHONE = '+221771234567'

const SAFE_KEYS = new Set(['requestNumber', 'createdAt', 'status', 'vehicle', 'preferredContactMethod'])
const FORBIDDEN_ROW_KEYS = ['id', 'admin_notes', 'customer_name', 'customer_email', 'customer_phone', 'whatsapp_phone']

let passed = 0
let failed = 0

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok   ${label}`)
    passed++
  } else {
    console.log(`  FAIL ${label}`)
    failed++
  }
}

async function main() {
  console.log('Creating temporary vehicle_requests row...')
  const requestNumber = await generateVehicleRequestNumber()

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('vehicle_requests')
    .insert({
      request_number: requestNumber,
      customer_name: 'Dev Test Customer',
      customer_email: TEST_EMAIL,
      customer_phone: TEST_PHONE,
      preferred_contact_method: 'email',
      make: 'Toyota',
      model: 'Hilux',
      year_from: 2018,
      year_to: 2022,
      currency: 'XOF',
      admin_notes: 'THIS SHOULD NEVER BE VISIBLE TO A CUSTOMER',
      locale: 'en',
    })
    .select('id, tracking_token')
    .single()

  if (insertError || !inserted) {
    console.error('Failed to insert temporary row:', insertError?.message)
    process.exitCode = 1
    return
  }

  const requestId = inserted.id as string
  const trackingToken = inserted.tracking_token as string
  console.log(`Created ${requestNumber} (id=${requestId}, token=${trackingToken})\n`)

  try {
    console.log('1. Lookup by correct email')
    check('returns the tracking token', (await lookupVehicleTrackingToken(requestNumber, TEST_EMAIL)) === trackingToken)

    console.log('2. Lookup by correct phone')
    check('returns the tracking token', (await lookupVehicleTrackingToken(requestNumber, TEST_PHONE)) === trackingToken)

    console.log('3. Lookup by wrong email')
    check('returns null', (await lookupVehicleTrackingToken(requestNumber, 'wrong@example.com')) === null)

    console.log('4. Lookup by wrong request number')
    check('returns null', (await lookupVehicleTrackingToken('VR-000000000', TEST_EMAIL)) === null)

    console.log('5. getVehicleTrackingInfo(token)')
    const info = await getVehicleTrackingInfo(trackingToken)
    check('returns non-null', info !== null)
    if (info) {
      check('requestNumber matches', info.requestNumber === requestNumber)
      check('status is request_received', info.status === 'request_received')
      check('vehicle.make is Toyota', info.vehicle.make === 'Toyota')
      const keys = Object.keys(info)
      check('top-level keys are exactly the safe set', keys.length === SAFE_KEYS.size && keys.every((k) => SAFE_KEYS.has(k)))
      check('no admin_notes on the DTO', !('admin_notes' in info))
      check('no internal id on the DTO', !('id' in info))
    }

    console.log('6. Confirm the forbidden columns really exist on the raw row (proves #5 is a real allowlist, not a schema coincidence)')
    const { data: rawRow } = await supabaseAdmin.from('vehicle_requests').select('*').eq('id', requestId).single()
    check(
      'raw row actually has the forbidden columns',
      Boolean(rawRow) && FORBIDDEN_ROW_KEYS.every((k) => k in (rawRow as Record<string, unknown>))
    )
  } finally {
    console.log('\nDeleting temporary row...')
    const { error: deleteError } = await supabaseAdmin.from('vehicle_requests').delete().eq('id', requestId)
    if (deleteError) console.error('WARNING: failed to delete temporary row, clean up manually:', requestId, deleteError.message)
    else console.log('Deleted.')
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('Script threw:', err)
  process.exitCode = 1
})
